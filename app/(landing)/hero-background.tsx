"use client"

import React, { useEffect, useRef } from "react"

// Lightweight, dependency-free WebGL background.
// - Dark theme friendly, subtle animated gradient with flow-like highlights
// - Responds to pointer movement (parallax)
// - Respects prefers-reduced-motion
// - Handles resize, visibility changes, and cleans up on unmount

export default function HeroBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-hidden", "true")
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.display = "block"
    canvas.style.pointerEvents = "none"
    canvasRef.current = canvas
    container.appendChild(canvas)

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    // Attempt WebGL, fallback to a static gradient if unavailable
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true })
    if (!gl) {
      container.style.background =
        "radial-gradient(1200px 800px at 70% 30%, rgba(88, 28, 135, 0.2), rgba(2,6,23,0.2) 60%), linear-gradient(180deg, rgba(2,6,23,0.9), rgba(2,6,23,0.95))"
      return
    }
    const glc = gl as WebGLRenderingContext
    const containerEl = container as HTMLDivElement

    // Basic shaders. Fragment shader produces a soft, animated dark gradient with flowing bands
    const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

    const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;

// Hash and noise utilities
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    f += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return f;
}

// SDF helpers for glyph overlay
const float RT2 = 0.70710678;
float sdCircle(vec2 q, float r) { return length(q) - r; }
float sdH(vec2 q, float th) { return abs(q.y) - th; }
float sdV(vec2 q, float th) { return abs(q.x) - th; }
float sdSlash(vec2 q, float th) { return (abs(q.x + q.y) * RT2) - th; }
float sdBackSlash(vec2 q, float th) { return (abs(q.x - q.y) * RT2) - th; }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 centered = uv - 0.5;
  centered.x *= u_resolution.x / u_resolution.y;

  // Pointer parallax
  vec2 p = centered;
  p += (u_pointer - 0.5) * 0.12;

  // Slow time for subtle motion
  float t = u_time * 0.08;

  // Base gradient
  float radial = length(p);
  float vignette = smoothstep(0.9, 0.25, radial);

  // Flowing bands mixed with fbm noise
  float bands = sin(p.y * 5.0 + t * 2.0) * 0.5 + 0.5;
  float flow = fbm(p * 1.5 + vec2(t * 0.3, -t * 0.25));

  // Color palette tuned for dark UI
  vec3 baseColor = vec3(0.02, 0.05, 0.12);        // near-black blue
  vec3 accentA = vec3(0.32, 0.14, 0.52);          // deep purple
  vec3 accentB = vec3(0.07, 0.32, 0.45);          // teal/blue

  vec3 color = baseColor;
  color += 0.25 * mix(accentA, accentB, bands);
  color += 0.18 * flow * accentA;
  color *= vignette;

  // Animated caustics layer
  vec2 cp = p * 2.8;
  float c1 = sin(cp.x * 1.8 + t * 2.2) + cos(cp.y * 2.1 - t * 1.6);
  float c2 = sin(dot(cp, vec2(1.7, 1.1)) + t * 1.3);
  float caustics = pow(abs(c1 * 0.6 + c2 * 0.4), 6.0);
  vec3 causticTint = mix(accentB, accentA, 0.6);
  color += causticTint * caustics * 0.12;

  // Subtle bloom-like lift in highlights
  float highlight = smoothstep(0.65, 1.0, flow * bands);
  color += 0.06 * highlight;

  // Film grain for depth
  float grain = hash(gl_FragCoord.xy + vec2(t * 60.0)) * 2.0 - 1.0;
  color += grain * 0.008;

  // -----------------------------
  // Glyph dither overlay (procedural)
  // -----------------------------
  float cellPx = 11.0; // density; lower -> denser
  vec2 grid = gl_FragCoord.xy / cellPx;
  vec2 cellId = floor(grid);
  vec2 cellUV = fract(grid); // 0..1

  // Use brightness of current color to pick glyph complexity
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  // Add slight variation per cell to avoid banding
  float jitter = hash(cellId + vec2(t));
  float level = clamp(luma * 1.2 + jitter * 0.15, 0.0, 1.0);

  // Local coords -1..1
  vec2 tuv = (cellUV - 0.5) * 2.0;
  // thickness preset baked into SDF functions

  // Map levels to glyph shapes: 0 none, 1 dot, 2 dash, 3 plus, 4 star, 5 hash
  float g0 = 1.0; // empty, no draw
  float g1 = sdCircle(tuv, 0.18);
  float g2 = sdH(tuv, 0.12);
  float g3 = min(sdH(tuv, 0.10), sdV(tuv, 0.10));
  float g4 = min(min(sdSlash(tuv, 0.085), sdBackSlash(tuv, 0.085)), g3);
  float g5 = min(max(sdH(tuv, 0.20), sdV(tuv, 0.02)), max(sdH(tuv, 0.02), sdV(tuv, 0.20)));

  float sdf;
  if (level < 0.18) {
    sdf = 1.0; // no glyph
  } else if (level < 0.36) {
    sdf = g1;
  } else if (level < 0.54) {
    sdf = g2;
  } else if (level < 0.72) {
    sdf = g3;
  } else if (level < 0.88) {
    sdf = g4;
  } else {
    sdf = g5;
  }

  float stroke = 1.0 - smoothstep(0.015, 0.0, -sdf);
  vec3 glyphColor = mix(vec3(0.9), vec3(1.0), 0.2);
  // Slight per-cell tint shift for richness
  glyphColor = mix(glyphColor, mix(accentA, accentB, hash(cellId * 1.37)), 0.25);
  color += glyphColor * stroke * 0.06;

  gl_FragColor = vec4(color, 1.0);
}
`

    function compileShader(type: number, source: string): WebGLShader {
      const shader = glc.createShader(type) as WebGLShader
      glc.shaderSource(shader, source)
      glc.compileShader(shader)
      if (!glc.getShaderParameter(shader, glc.COMPILE_STATUS)) {
        const info = glc.getShaderInfoLog(shader)
        glc.deleteShader(shader)
        throw new Error(`Shader compile error: ${info ?? "unknown"}`)
      }
      return shader
    }

    function createProgram(vsSource: string, fsSource: string): WebGLProgram {
      const vertexShader = compileShader(glc.VERTEX_SHADER, vsSource)
      const fragmentShader = compileShader(glc.FRAGMENT_SHADER, fsSource)
      const program = glc.createProgram() as WebGLProgram
      glc.attachShader(program, vertexShader)
      glc.attachShader(program, fragmentShader)
      glc.linkProgram(program)
      if (!glc.getProgramParameter(program, glc.LINK_STATUS)) {
        const info = glc.getProgramInfoLog(program)
        glc.deleteProgram(program)
        throw new Error(`Program link error: ${info ?? "unknown"}`)
      }
      glc.deleteShader(vertexShader)
      glc.deleteShader(fragmentShader)
      return program
    }

    const program = createProgram(vertexShaderSource, fragmentShaderSource)
    glc.useProgram(program)

    const positionBuffer = glc.createBuffer()
    glc.bindBuffer(glc.ARRAY_BUFFER, positionBuffer)
    // Fullscreen quad (two triangles)
    const vertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ])
    glc.bufferData(glc.ARRAY_BUFFER, vertices, glc.STATIC_DRAW)

    const aPositionLoc = glc.getAttribLocation(program, "a_position")
    glc.enableVertexAttribArray(aPositionLoc)
    glc.vertexAttribPointer(aPositionLoc, 2, glc.FLOAT, false, 0, 0)

    const uResolutionLoc = glc.getUniformLocation(program, "u_resolution")
    const uTimeLoc = glc.getUniformLocation(program, "u_time")
    const uPointerLoc = glc.getUniformLocation(program, "u_pointer")

    let pointerX = 0.5
    let pointerY = 0.5
    let animationFrameId = 0
    let startTime = performance.now()
    let isVisible = true

    const maxDevicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.75)

    function resize() {
      const { clientWidth, clientHeight } = containerEl
      const dpr = maxDevicePixelRatio
      const width = Math.max(1, Math.floor(clientWidth * dpr))
      const height = Math.max(1, Math.floor(clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        glc.viewport(0, 0, width, height)
      }
    }

    resize()

    function onPointerMove(e: PointerEvent) {
      const rect = containerEl.getBoundingClientRect()
      pointerX = (e.clientX - rect.left) / rect.width
      pointerY = (e.clientY - rect.top) / rect.height
    }

    // Use lower refresh if reduced motion is requested
    const targetFrameTimeMs = prefersReducedMotion ? 1000 / 24 : 1000 / 60
    let previousTimestamp = performance.now()
    function render(now: number) {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render)
        return
      }
      const elapsed = now - previousTimestamp
      if (elapsed < targetFrameTimeMs) {
        animationFrameId = requestAnimationFrame(render)
        return
      }
      previousTimestamp = now

      resize()
      const timeSec = (now - startTime) / 1000
      glc.uniform2f(uResolutionLoc, canvas.width, canvas.height)
      glc.uniform1f(uTimeLoc, timeSec)
      glc.uniform2f(uPointerLoc, pointerX, 1.0 - pointerY)

      glc.drawArrays(glc.TRIANGLES, 0, 6)
      animationFrameId = requestAnimationFrame(render)
    }

    const onVisibilityChange = () => {
      isVisible = !document.hidden
    }

    const onResize = () => resize()

    containerEl.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("resize", onResize, { passive: true })
    document.addEventListener("visibilitychange", onVisibilityChange)

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      containerEl.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      try {
        glc.getExtension("WEBGL_lose_context")?.loseContext()
      } catch {}
      canvas.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 [mask-image:radial-gradient(75%_55%_at_50%_40%,#000_60%,transparent_100%)]"
      aria-hidden
    />
  )
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

// Lazy load Three.js only when needed
const loadThree = () => import("three");

export default function ThreeAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [THREE, setTHREE] = useState<any>(null);
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Load Three.js only when component is visible
  useEffect(() => {
    if (isIntersecting && !threeLoaded) {
      loadThree().then((threeModule) => {
        setTHREE(threeModule);
        setThreeLoaded(true);
      });
    }
  }, [isIntersecting, threeLoaded]);

  useEffect(() => {
    if (!THREE || !threeLoaded || !containerRef.current || typeof window === 'undefined') return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x160016);

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, containerWidth / containerHeight, 1, 1000);
    camera.position.set(0, 4, 21);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear any existing canvas
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    
    containerRef.current.appendChild(renderer.domElement);

    // Handle resize
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener("resize", handleResize);

    // Controls (simplified version of OrbitControls)
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let rotationX = 0;
    let rotationY = 0;

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isMouseDown) {
        const deltaX = event.clientX - mouseX;
        const deltaY = event.clientY - mouseY;
        targetRotationY += deltaX * 0.01;
        targetRotationX += deltaY * 0.01;
        mouseX = event.clientX;
        mouseY = event.clientY;
      }
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onMouseWheel = (event: WheelEvent) => {
      camera.position.z += event.deltaY * 0.01;
      camera.position.z = Math.min(Math.max(camera.position.z, 10), 30);
    };

    containerRef.current.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    containerRef.current.addEventListener("wheel", onMouseWheel);

    // Animation setup
    const gu = {
      time: { value: 0 }
    };

    const sizes: number[] = [];
    const shift: number[] = [];
    const pushShift = () => {
      shift.push(
        Math.random() * Math.PI, 
        Math.random() * Math.PI * 2, 
        (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
        Math.random() * 0.9 + 0.1
      );
    };

    const pts: any[] = [];
    for (let i = 0; i < 50000; i++) {
      sizes.push(Math.random() * 1.5 + 0.5);
      pushShift();
      pts.push(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5));
    }

    for (let i = 0; i < 100000; i++) {
      const r = 10, R = 40;
      const rand = Math.pow(Math.random(), 1.5);
      const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
      pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2));
      sizes.push(Math.random() * 1.5 + 0.5);
      pushShift();
    }

    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
    g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

    const m = new THREE.ShaderMaterial({
      uniforms: { time: gu.time },
      vertexShader: `
        uniform float time;
        attribute float sizes;
        attribute vec4 shift;
        varying vec3 vColor;
        
        void main() {
          vec3 transformed = position;
          
          float d = length(abs(position) / vec3(40., 10., 40));
          d = clamp(d, 0., 1.);
          vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
          
          float t = time;
          float moveT = mod(shift.x + shift.z * t, ${Math.PI * 2});
          float moveS = mod(shift.y + shift.z * t, ${Math.PI * 2});
          transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
          
          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 0.125 * sizes;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float d = length(gl_PointCoord.xy - 0.5);
          if (d > 0.5) discard;
          vec4 diffuseColor = vec4(vColor, smoothstep(0.5, 0.1, d));
          gl_FragColor = diffuseColor;
        }
      `,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const p = new THREE.Points(g, m);
    p.rotation.order = "ZYX";
    p.rotation.z = 0.2;
    scene.add(p);

    const clock = new THREE.Clock();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Smooth rotation
      rotationX += (targetRotationX - rotationX) * 0.05;
      rotationY += (targetRotationY - rotationY) * 0.05;
      p.rotation.x = rotationX;
      p.rotation.y = rotationY;
      
      const t = clock.getElapsedTime() * 0.5;
      gu.time.value = t * Math.PI;
      p.rotation.y = t * 0.05;
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Store references for cleanup
    const geometry = g;
    const material = m;
    const points = p;

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      containerRef.current?.removeEventListener("wheel", onMouseWheel);
      
      // Dispose of Three.js objects
      geometry.dispose();
      material.dispose();
      points.geometry.dispose();
      if (Array.isArray(points.material)) {
        points.material.forEach((material: any) => material.dispose());
      } else {
        points.material.dispose();
      }
      renderer.dispose();
    };
  }, [THREE, threeLoaded]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        elementRef.current = node;
      }}
      className="absolute inset-0 -z-10 overflow-hidden"
      style={{ pointerEvents: 'none' }}
    >
      {!threeLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 animate-pulse" />
      )}
    </div>
  );
}

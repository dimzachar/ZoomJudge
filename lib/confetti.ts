import confetti from 'canvas-confetti'

export function fireConfettiBurst(): void {
  confetti({
    particleCount: 140,
    spread: 70,
    origin: { y: 0.6 },
    ticks: 120,
  })
}

export function celebrate(durationMs: number = 1800): () => void {
  const endTime = Date.now() + durationMs

  // Side bursts create a more engaging effect without being overbearing
  const intervalId = window.setInterval(() => {
    const timeLeft = endTime - Date.now()
    if (timeLeft <= 0) {
      window.clearInterval(intervalId)
      return
    }

    confetti({
      startVelocity: 45,
      spread: 60,
      ticks: 100,
      particleCount: 60,
      origin: { x: Math.random() * 0.3 + 0.1, y: 0.6 },
    })

    confetti({
      startVelocity: 45,
      spread: 60,
      ticks: 100,
      particleCount: 60,
      origin: { x: 0.9 - Math.random() * 0.3, y: 0.6 },
    })
  }, 220)

  return () => window.clearInterval(intervalId)
}



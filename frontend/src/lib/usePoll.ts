import { useEffect, useRef, useState } from 'react'

export function usePoll<T>(
  fn: () => Promise<T>,
  ms: number = 4000
): { data: T | null; error: Error | null; isLoading: boolean } {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        setIsLoading(true)
        const result = await fn()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    // Initial call
    poll()

    // Set up interval
    intervalRef.current = setInterval(poll, ms)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fn, ms])

  return { data, error, isLoading }
}

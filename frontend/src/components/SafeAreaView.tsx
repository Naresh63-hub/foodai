import { PropsWithChildren } from 'react'

export default function SafeAreaView({ children }: PropsWithChildren) {
  return (
    <div className="safe-top safe-bottom min-h-screen">
      {children}
    </div>
  )
}

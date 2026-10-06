import { PropsWithChildren } from 'react'

export default function SafeAreaView({ children }: PropsWithChildren) {
  return (
    <div className="safe-top safe-bottom min-h-screen w-full max-w-full overflow-x-hidden box-border">
      {children}
    </div>
  )
}

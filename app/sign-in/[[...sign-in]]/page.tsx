import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ink rounded-forge flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="text-xl font-semibold text-ink">Forge</span>
        </div>
        <SignIn />
      </div>
    </div>
  )
}

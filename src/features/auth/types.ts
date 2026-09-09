export interface User {
  id: string
  email: string
  name: string
  active: boolean
  isEmailVerified: boolean
  isOnboardingCompleted: boolean
  googleId: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RefreshTokenPayload {
  refreshToken: string
}

export interface LoginResponseData extends AuthTokens {
  user: User
}

export type RefreshResponseData = AuthTokens

export type AuthTokenInfo = { 
  userId: string;
  status: boolean;
  expiredAt?: Date;
  isNew? : boolean;
}

export interface DecodeInfo {
  exp: number;
  iat: number;
  isNew?: boolean;
}
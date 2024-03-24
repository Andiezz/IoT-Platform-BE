import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify, sign, VerifyErrors, decode } from 'jsonwebtoken';
import { JwtConfiguration } from 'src/shared/configuration/configuration';
import { AuthTokenInfo } from './interfaces';

@Injectable()
export class JwtService {
  private readonly configuration: JwtConfiguration;
  constructor(private readonly cfg: ConfigService) {
    this.configuration = this.cfg.getOrThrow('jwt');
  }

  public async generateToken(payload: Record<string, unknown>, expire?: number): Promise<string> {
    return new Promise((rs, rj) => {
      sign(
        payload,
        this.configuration.jwtSec,
        {
          expiresIn: expire || this.configuration.jwtLifetime,
        },
        (err, result) => {
          if (err) {
            rj(err);
          } else {
            rs(result);
          }
        },
      );
    });
  }

  public async verifyToken(token: string): Promise<boolean | VerifyErrors> {
    return new Promise((rs, rj) => {
      verify(token, this.configuration.jwtSec, (err) => {
        if (err) {
          rj(err);
        } else {
          rs(true);
        }
      });
    });
  }

  async decodeToken(token: string): Promise<AuthTokenInfo | VerifyErrors> {
    return new Promise((rs, rj) => {
      verify(token, this.configuration.jwtSec, (err, decoded: AuthTokenInfo) => {
        if (err) {
          rj(err);
        } else {
          rs(decoded);
        }
      });
    });
  }

  async decode(token: string) {
    return new Promise((rs, rj) => {
      const result = decode(token);
      if (!result) {
        rj('decode-error')
      }
      rs(result);
    })
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '../jwt/jwt.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [JwtModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule { }

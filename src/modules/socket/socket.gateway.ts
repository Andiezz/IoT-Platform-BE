import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '../jwt/jwt.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger(SocketGateway.name);
  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const header =
        client.handshake.auth.Authorization ??
        client.handshake.headers.Authorization;
      if (!header) {
        client.disconnect(true);
        return;
      }
      const token = header.split(' ')[1];
      const verifyToken = await this.jwtService.verifyToken(token);
      if (!verifyToken) {
        this.logger.log('Disconnected: ' + client.id, 'SocketConnection');
        client.disconnect(true);
      }
      this.logger.log('Connected: ' + client.id, 'SocketConnection');
    } catch (err) {
      this.logger.log('err', err);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log('Disconnected: ', client.id, 'SocketConnection');
  }

  async publish(topic: string, message: any) {
    this.server.emit(topic, message);
  }
}

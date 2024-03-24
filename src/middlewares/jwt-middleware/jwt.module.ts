import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from 'src/modules/jwt/jwt.module';
import { JwtAuthenticationMiddleware } from './jwt.middleware';
import { MongoModule } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';

@Module({
  imports: [
    JwtModule,
    MongoModule.forFeature([
      NormalCollection.USER_LOGIN,
      NormalCollection.USER,
    ]),
  ],
  providers: [JwtAuthenticationMiddleware],
  exports: [JwtAuthenticationMiddleware],
})
export class JwtAuthenticationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthenticationMiddleware)
      .exclude(
        'auth/login',
        'healthz',
        'ws',
        'test/(.*)',
        'init/start',
        'auth/forgot-password',
        'auth/create-new-password',
        'auth/refresh-token',
        'user-mgt/account/activate',
      )
      .forRoutes('*');
  }
}

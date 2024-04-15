import { Module } from '@nestjs/common';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ParameterStandardService } from './parameter-standard.service';
import { ParameterStandardController } from 'src/controllers/parameter-standard/parameter-standard.controller';

@Module({
  imports: [MongoModule.forFeature([NormalCollection.PARAMETER_STANDARD])],
  controllers: [ParameterStandardController],
  providers: [ParameterStandardService],
  exports: [ParameterStandardService],
})
export class ParameterStandardModule {}

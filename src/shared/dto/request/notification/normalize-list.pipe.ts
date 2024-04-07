import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ListNotificationDto } from './list.request';

@Injectable()
export class NormalizeListNotificationPipe implements PipeTransform {
  transform(query: ListNotificationDto, metadata: ArgumentMetadata) {
    if (query.limit == undefined) {
      query.limit = 0;
    }

    if (query.page == undefined) {
      query.page = 1;
    }

    return query;
  }
}

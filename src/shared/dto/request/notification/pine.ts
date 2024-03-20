import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { FindQueryDto } from "./find-query.request";

@Injectable()
export class NormalizeFindQueryPipe implements PipeTransform {
  transform(query: FindQueryDto, metadata: ArgumentMetadata) {
    if (query.limit == undefined) {
      query.limit = 0;
    }

    if (query.page == undefined) {
      query.page = 1;
    }

    return query;
  }
}
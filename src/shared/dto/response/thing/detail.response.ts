import { ApiProperty } from '@nestjs/swagger';
import {
  Certificate,
  DEVICE_STATUS,
  Device,
  Location,
  Manager,
} from 'src/shared/models/thing.model';

export class ThingResponse {
  @ApiProperty()
  public _id: string;

  @ApiProperty()
  public name: string;

  @ApiProperty()
  information: string;

  @ApiProperty({ type: Location })
  location: Location;

  @ApiProperty()
  status: DEVICE_STATUS;

  @ApiProperty({ type: [Manager] })
  managers: Manager[];

  @ApiProperty({ type: Certificate})
  certificate: Certificate;

  @ApiProperty({ type: [Device] })
  devices: Device[];

  @ApiProperty()
  createdOn: string;

  @ApiProperty()
  updatedOn: string;
}

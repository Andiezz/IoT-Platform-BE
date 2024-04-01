import { ApiProperty } from "@nestjs/swagger";
import { ObjectId } from "mongodb";

class BaseResponse {
    @ApiProperty()
    public _id: string;
}

// class Owner extends BaseResponse {
//     @ApiProperty()
//     user_id: string | ObjectId;

//     @ApiProperty()
//     type: string;

//     @ApiProperty()
//     target: string | ObjectId;

//     @ApiProperty()
//     target_model: string;

//     @ApiProperty()
//     user: User;

//     @ApiProperty()
//     createdOn: string;

//     @ApiProperty()
//     updatedOn: string;
// }

export class ViewPlantResponse extends BaseResponse {
    @ApiProperty()
    public tenant_id: string | ObjectId;

    @ApiProperty()
    public name: string;

    // @ApiProperty({ type: [Owner] })
    // owners: Owner;

    // @ApiProperty({ type: [Location] })
    // locations: Location[];

    @ApiProperty()
    createdOn: string;

    @ApiProperty()
    updatedOn: string;
}

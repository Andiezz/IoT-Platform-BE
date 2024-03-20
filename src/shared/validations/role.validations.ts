import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { ValidationService } from 'src/modules/validation/validation.service';
import { ObjectId } from 'mongodb';
import { NormalCollection } from '../constants/mongo.collection';

@ValidatorConstraint({ name: 'Role', async: true })
@Injectable()
export class RoleValidation implements ValidatorConstraintInterface {
    constructor(
        private readonly service: ValidationService
    ) { }
    async validate(value: string, args: ValidationArguments): Promise<boolean> {
        const [role] = args.constraints;
        if (!value || !role) return true;
        try {
            const user = await this.service.collection(NormalCollection.USERS).aggregate([
                {
                    $match: {
                        _id: new ObjectId(value),
                    },
                },
                {
                    $lookup: {
                        from: NormalCollection.USER_ROLES,
                        localField: '_id',
                        foreignField: 'user_id',
                        as: 'user_role',
                    },
                },
                {
                    $lookup: {
                        from: NormalCollection.ROLES,
                        localField: 'user_role.role_id',
                        foreignField: '_id',
                        as: 'role',
                    },
                },
                {
                    $unwind: '$role',
                },
            ]).toArray();
            if (!user.length) return false;
            if (![user[0].role.role].includes(role)) return false;

        } catch (error) {
            console.log(error)
            return false;
        }

        return true;
    }
}

export function Role(
    role: string,
    validationOptions?: ValidationOptions,
) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [role],
            validator: RoleValidation,
        });
    };
}
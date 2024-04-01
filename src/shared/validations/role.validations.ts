import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable, Logger } from '@nestjs/common';
import { ValidationService } from 'src/modules/validation/validation.service';
import { ObjectId } from 'mongodb';
import { NormalCollection } from '../constants/mongo.collection';
import { UserModel } from '../models/user.model';

@ValidatorConstraint({ name: 'Role', async: true })
@Injectable()
export class RoleValidation implements ValidatorConstraintInterface {
  private readonly logger: Logger = new Logger(RoleValidation.name);
  constructor(private readonly service: ValidationService) {}

  async validate(value: string, args: ValidationArguments): Promise<boolean> {
    const [role] = args.constraints;
    if (!value || !role) return true;
    try {
      const user = (await this.service
        .collection(NormalCollection.USER)
        .findOne({ _id: new ObjectId(value) })) as UserModel;

      if (![user?.role].includes(role)) {
        return false;
      }
    } catch (error) {
      this.logger.log(error);
      return false;
    }

    return true;
  }
}

export function Role(role: string, validationOptions?: ValidationOptions) {
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

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

@ValidatorConstraint({ name: 'TenantExist', async: true })
@Injectable()
export class ExistsValidation implements ValidatorConstraintInterface {
  constructor(private readonly service: ValidationService) {}
  async validate(value: string, args: ValidationArguments): Promise<boolean> {
    const [model, property] = args.constraints;
    if (!value || !model || (property && !args.object[property])) return true;
    try {
      const filters = {
        _id: new ObjectId(value),
        $or: [
          { isDeleted: false },
          { isActive: true },
          { isDeleted: { $exists: false } },
        ],
      };

      if (property && args.object[property])
        filters[property] = new ObjectId(args.object[property] as string);
      const record = await this.service.collection(model).findOne(filters);
      if (!record) return false;
    } catch (error) {
      return false;
    }

    return true;
  }
}

export function Exists(
  model: string,
  property?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [model, property],
      validator: ExistsValidation,
    });
  };
}

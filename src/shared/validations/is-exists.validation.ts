import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { ValidationService } from 'src/modules/validation/validation.service';

@ValidatorConstraint({ name: 'TenantExist', async: true })
@Injectable()
export class IsExistsValidation implements ValidatorConstraintInterface {
  constructor(private readonly service: ValidationService) {}
  async validate(value: string, args: ValidationArguments): Promise<boolean> {
    const [model, field, filters] = args.constraints;

    if (!value || !model || !field) return false;
    filters[field] = value;

    try {
      const record = await this.service.collection(model).findOne(filters);
      if (record) return false;
    } catch (error) {
      return false;
    }

    return true;
  }
}

export function IsExists(model: string, field: string, filters: object, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [model, field, filters],
      validator: IsExistsValidation,
    });
  };
}

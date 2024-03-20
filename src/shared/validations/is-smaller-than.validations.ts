import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';
import { ValidationService } from 'src/modules/validation/validation.service';

@ValidatorConstraint({ name: 'IsSmallerThan' })
@Injectable()
export class IsSmallerThanValidation implements ValidatorConstraintInterface {
  constructor(private readonly service: ValidationService) {}
  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return (typeof value === 'number' && typeof relatedValue === 'number' && value < relatedValue) || (typeof value === 'number' || typeof relatedValue === 'number');
  }
}

export function IsSmallerThan(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSmallerThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: IsSmallerThanValidation,
    });
  };
}

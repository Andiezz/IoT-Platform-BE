import { EvaluatedParameter } from 'src/shared/dto/request/notification/create.request';
import { convertParameterValueToIAQI } from '../parameter-standard/parameter-standard.constants';

export const TITLE = {
  EXCEED_THRESHOLD: 'Parameters in warning threshold',
};

// $1: thingId
// $2: Parameter - 'Threshold name': IAQI\n -> Ex: PM2.5 - Good: 30
export const CONTENT = {
  WARNING_THRESHOLD: `Thing $1 has the following parameters being in warning threshold:
    $2.`,
};

export const TYPE = {
  WARNING: 'Warning',
  NORMAL: 'Normal',
};

export const formatTemplateContentArgument = (
  parameters: EvaluatedParameter[],
) => {
  let argument = '';
  parameters.forEach((parameter) => {
    const iaqiValue = convertParameterValueToIAQI(parameter);
    const parameterContent = `\n${parameter.name} - ${
      parameter.threshold.name.charAt(0).toUpperCase() +
      parameter.threshold.name.slice(1)
    }: ${iaqiValue}\n`;
    argument += parameterContent;
  });
  return argument;
};

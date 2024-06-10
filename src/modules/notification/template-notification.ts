import { EvaluatedParameter } from 'src/shared/dto/request/notification/create.request';
import { convertParameterValueToIAQI } from '../parameter-standard/parameter-standard.constants';

export const TITLE = {
  EXCEED_THRESHOLD: 'Parameters in warning threshold',
};

// $1: thingId
// $2: Parameter - 'Threshold name': IAQI\n -> Ex: PM2.5 - Good: 30
export const CONTENT = {
  WARNING_THRESHOLD: `<p>Thing <strong>$1</strong> has the following parameters being in warning threshold:</p>
    <ul>
      $2
    </ul>`,
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
    argument += formatParameterContent(parameter);
  });
  return argument;
};

export const formatParameterContent = (parameter: EvaluatedParameter) => {
  const parameterName = parameter.name;
  const parameterThreshold =
    parameter.threshold.name.charAt(0).toUpperCase() +
    parameter.threshold.name.slice(1);
  const iaqiValue = convertParameterValueToIAQI(parameter);
  return `<li><strong>${parameterName}</strong> - ${parameterThreshold}: ${iaqiValue}</li>`;
};

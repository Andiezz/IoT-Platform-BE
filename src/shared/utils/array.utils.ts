export const checkDuplicateInArray = (array: any[], property: string) => {
  const propertyArray = array.map((item) => item[`${property}`]);
  return new Set(propertyArray).size < propertyArray.length;
};

export const checkValueExistInObjectArray = (
  array: any[],
  property: string,
  value: any,
) => {
  const propertyArray = array.map((item) => item[`${property}`].toString());
  return propertyArray.includes(value.toString());
};

export const concatenatePropertyHasValueStringInObjectArray = (
  array: object[],
  seperator: string,
  ...properties: string[]
): string => {
  if (array.length === 0) {
    return '';
  }

  let result = '';
  array.forEach((item, i) => {
    properties.forEach((prop, j) => {
      if (!item[`${prop}`]) {
        return;
      }
      result = result + item[`${prop}`];
    });

    if (i !== array.length - 1) {
      result = result + seperator;
    }
  });

  return result;
};


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

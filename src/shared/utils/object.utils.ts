export const deleteProps = (object: Object, props: string[] = []) => {
  for (let i = 0; i < props.length; i++) {
    if (object.hasOwnProperty(props[i])) {
      delete object[props[i]];
    }
  }
  return object;
}

export const removeDuplicateInArray = (array: any[]) => {
  return array.flat(Infinity).filter((value, index, array) => { 
    return array.indexOf(value) === index;
  });
}

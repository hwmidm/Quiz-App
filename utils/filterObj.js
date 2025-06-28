// This utility function filters an object, keeping only specified allowed fields
// It's useful for preventing users from updating sensitive or unauthorized fields

const filterObject = (obj, allowFields) => {
  const newObj = {}; // Object to store allowed (filtered) fields
  const invalidObj = []; // Array to store fields that were not allowed

  // Iterate over each key in the input object
  Object.keys(obj).forEach((el) => {
    // If the field is in the list of allowed fields, add it to newObj
    if (allowFields.includes(el)) {
      newObj[el] = obj[el];
    } else {
      // If the field is not allowed, add it to the invalid fields array
      invalidObj.push(el);
    }
  });
  // Return an object containing both the filtered data and any invalid fields found
  return { filtered: newObj, invalid: invalidObj };
};

export default filterObject;

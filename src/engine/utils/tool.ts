export const isNil = (value) => {
  /**
   * isNil(null) => true
   * isNil() => true
   */
  return value === null || value === undefined;
};

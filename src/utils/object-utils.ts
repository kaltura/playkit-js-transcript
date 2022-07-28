export class ObjectUtils {
  public static get(obj: Record<string, any>, path: string, defaultValue: any): any {
    function stringToPath(path: string) {
      const output: any = [];
      // Split to an array with dot notation
      path.split('.').forEach(item => {
        // Split to an array with bracket notation
        item.split(/\[([^}]+)\]/g).forEach(key => {
          // Push to the new array
          if (key.length > 0) {
            output.push(key);
          }
        });
      });
      return output;
    }

    // Get the path as an array
    const pathArray = stringToPath(path);

    let current = obj;

    // For each item in the path, dig into the object
    for (let i = 0; i < pathArray.length; i++) {
      // If the item isn't found, return the default (or null)
      if (!current[pathArray[i]]) return defaultValue;

      // Otherwise, update the current value
      current = current[pathArray[i]];
    }

    return current;
  }
}

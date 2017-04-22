export const document = {
  getElementById(id) {
    return {
      width: 200,
      height: 100,
      getContext() {
        return {
          createImageData(width, height) {
            return {
              width,
              height,
              data: new Uint8ClampedArray(width * height * 4),
            };
          },
          putImageData() {  },
        };
      },
    };
  },
};

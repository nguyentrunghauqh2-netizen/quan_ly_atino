(() => {
  'use strict';
  const extensions = Object.freeze({'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'});

  function isDataImage(value) {
    return typeof value === 'string' && /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value);
  }

  function validate(file) {
    if (!extensions[file.type]) throw new Error('Chọn ảnh JPG, PNG hoặc WebP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh phải có dung lượng tối đa 5 MB.');
  }

  function read(file) {
    validate(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Chưa đọc được ảnh.'));
      reader.readAsDataURL(file);
    });
  }

  async function thumbnail(file, maxSide) {
    validate(file);
    const image = await createImageBitmap(file);
    try {
      const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', 0.82);
    } finally {
      image.close();
    }
  }

  window.AtinoImages = {extensions, isDataImage, read, thumbnail};
})();

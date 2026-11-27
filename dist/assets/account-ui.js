(() => {
  'use strict';
  const images = window.AtinoImages;
  const safe = value => escapeHtml(String(value ?? ''));
  const valueOf = (form, name) => form.elements.namedItem(name).value;

  function dialog(title, contents, submitLabel, onSubmit) {
    const element = document.createElement('dialog');
    element.className = 'atino-account-dialog';
    element.setAttribute('aria-label', title);
    element.innerHTML = `<form>
      <header><h2>${safe(title)}</h2></header>
      <div class="atino-account-fields">${contents}</div>
      <p class="atino-account-error" role="alert" hidden></p>
      <footer><button type="button" class="secondary" data-close>Đóng</button>
      <button type="submit" class="primary">${safe(submitLabel)}</button></footer>
    </form>`;
    const form = element.querySelector('form');
    const close = form.querySelector('[data-close]');
    const submit = form.querySelector('button[type="submit"]');
    const previous = document.activeElement;
    let busy = false;
    close.addEventListener('click', () => element.close());
    element.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    element.addEventListener('close', () => { element.remove(); if (previous?.isConnected) previous.focus(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const error = form.querySelector('[role="alert"]');
      error.hidden = true;
      busy = close.disabled = submit.disabled = true;
      try {
        if (await onSubmit(form) !== false && element.open) element.close();
      } catch (failure) {
        error.textContent = failure.message;
        error.hidden = false;
      } finally {
        busy = close.disabled = submit.disabled = false;
      }
    });
    document.body.append(element);
    element.showModal();
    return element;
  }

  function field(label, name, value = '', type = 'text', attributes = '') {
    return `<label>${safe(label)}<input class="field" type="${type}" name="${name}" value="${safe(value)}" ${attributes}></label>`;
  }

  function paintAvatar(element, user) {
    if (!element) return;
    if (user?.avatar) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = user.avatar;
      element.replaceChildren(image);
      return;
    }
    element.textContent = (user?.name || 'Atino').trim().split(/\s+/).slice(-2).map(word => word[0]).join('').toUpperCase();
  }

  function setMessage(message) {
    if (currentUser?.role === 'manager') window.AtinoManager.toast(message);
    else notify(message);
  }

  async function open() {
    try {
      const {profile} = await api('account');
      const contents = `<div class="atino-account-summary"><div class="atino-profile-avatar"></div><div><strong>${safe(profile.username)}</strong>
        <small>${profile.role === 'manager' ? 'Quản lý' : 'Nhân viên'} · ${safe(profile.code)}</small></div></div>
        <div class="atino-account-grid">
          ${field('Họ tên', 'name', profile.name, 'text', 'required maxlength="100"')}
          ${field('Số điện thoại', 'phone', profile.phone, 'tel', 'maxlength="25"')}
          ${field('Email', 'email', profile.email, 'email', 'maxlength="150"')}
          ${field('Ngày sinh', 'birthday', profile.birthday, 'date', `max="${window.AtinoERP.today()}"`)}
          <label>Giới tính<select class="field" name="gender">${['', 'Nữ', 'Nam', 'Khác'].map(value =>
            `<option value="${safe(value)}" ${profile.gender === value ? 'selected' : ''}>${safe(value || 'Chưa chọn')}</option>`).join('')}</select></label>
          ${field('Địa chỉ', 'address', profile.address, 'text', 'maxlength="300"')}
        </div>
        <label>Ảnh đại diện (tối đa 5 MB)<input name="avatar" class="field" type="file" accept="image/jpeg,image/png,image/webp"></label>
        ${profile.avatar ? '<label class="atino-account-check"><input name="removeAvatar" type="checkbox"> Xóa ảnh đại diện</label>' : ''}
        <div class="atino-account-actions">
          <button type="button" class="secondary" data-account-password>Đổi mật khẩu</button>
          <button type="button" class="secondary" data-account-code>${profile.hasRecoveryCode ? 'Đổi mã khôi phục' : 'Tạo mã khôi phục'}</button>
          <button type="button" class="secondary" data-account-feedback>Báo lỗi</button>
        </div>`;
      const element = dialog('Tài khoản', contents, 'Lưu hồ sơ', async form => {
        const data = Object.fromEntries(['name', 'phone', 'email', 'address', 'birthday', 'gender'].map(key => [key, valueOf(form, key)]));
        const file = form.elements.avatar.files[0];
        if (file) data.avatar = await images.thumbnail(file,192);
        else if (form.elements.removeAvatar?.checked) data.avatar = '';
        await writeApi('account/profile', data, 'PATCH');
        await refreshStore();
        if (currentUser?.role === 'manager') await window.AtinoManager.refresh();
        setMessage('Đã lưu hồ sơ tài khoản.');
      });
      paintAvatar(element.querySelector('.atino-profile-avatar'), profile);
      element.querySelector('[data-account-password]').addEventListener('click', () => { element.close(); changePassword(); });
      element.querySelector('[data-account-code]').addEventListener('click', () => { element.close(); createRecoveryCode(); });
      element.querySelector('[data-account-feedback]').addEventListener('click', () => {
        element.close();
        openDraft({title: 'Báo lỗi phần mềm', subject: 'Atino · Báo lỗi phần mềm'});
      });
    } catch (error) {
      setMessage(error.message);
    }
  }

  function passwordInput(label, name, attributes) {
    return field(label, name, '', 'password', 'required maxlength="256" ' + attributes);
  }
  function matchingPassword(form) {
    const password = valueOf(form, 'newPassword');
    if (password !== valueOf(form, 'confirmation')) throw new Error('Hai lần nhập mật khẩu mới cần giống nhau.');
    return password;
  }
  function newPasswordFields() {
    return passwordInput('Mật khẩu mới', 'newPassword', 'minlength="8" autocomplete="new-password"') +
      passwordInput('Nhập lại mật khẩu mới', 'confirmation', 'minlength="8" autocomplete="new-password"');
  }

  function changePassword() {
    dialog('Đổi mật khẩu', passwordInput('Mật khẩu hiện tại', 'password', 'autocomplete="current-password"') + newPasswordFields(),
      'Lưu mật khẩu', async form => {
        await writeApi('account/password', {password: valueOf(form, 'password'), newPassword: matchingPassword(form)});
        setMessage('Đã đổi mật khẩu. Bạn có thể tạo mã khôi phục mới trong Tài khoản.');
      });
  }

  function createRecoveryCode() {
    dialog('Mã khôi phục', '<p>Lưu mã ở nơi an toàn để đặt lại mật khẩu khi cần. Mỗi mã dùng một lần.</p>' +
      passwordInput('Mật khẩu hiện tại', 'password', 'autocomplete="current-password"'), 'Tạo mã', async form => {
        const {code} = await writeApi('account/recovery-code', {password: valueOf(form, 'password')});
        form.querySelector('.atino-account-fields').innerHTML = `<p>Mã khôi phục của bạn</p><output class="atino-recovery-code">${safe(code)}</output><p>Hãy lưu mã trước khi đóng.</p>`;
        form.querySelector('button[type="submit"]').hidden = true;
        return false;
      });
  }

  function forgotPassword() {
    const login = byId('login-form');
    dialog('Quên mật khẩu', '<p>Dùng mã khôi phục đã tạo trong Tài khoản. Nếu chưa có mã, hãy liên hệ quản lý cửa hàng.</p>' +
      field('Tên đăng nhập', 'username', login.elements.username.value, 'text', 'required maxlength="50" autocomplete="username"') +
      field('Mã khôi phục', 'code', '', 'text', 'required maxlength="45" autocomplete="off"') + newPasswordFields(),
    'Đặt lại mật khẩu', async form => {
      const username = valueOf(form, 'username');
      await writeApi('account/reset-password', {username, code: valueOf(form, 'code'), newPassword: matchingPassword(form)});
      login.elements.username.value = username;
      byId('login-status').dataset.error = 'false';
      byId('login-status').textContent = 'Đã đặt lại mật khẩu. Đăng nhập bằng mật khẩu mới.';
    });
  }

  function base64(value) {
    return btoa(String.fromCharCode(...new TextEncoder().encode(value)));
  }
  const wrapBase64 = value => value.match(/.{1,76}/g)?.join('\r\n') || '';

  function emailDraft({to, subject, body, attachment}) {
    const encodedSubject = (subject.match(/.{1,11}/gu) || []).map(text => '=?UTF-8?B?' + base64(text) + '?=').join('\r\n ');
    const headers = ['X-Unsent: 1', 'To: ' + to, 'Subject: ' + encodedSubject, 'MIME-Version: 1.0'];
    const textPart = ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrapBase64(base64(body))];
    if (!attachment) return [...headers, ...textPart, ''].join('\r\n');
    const boundary = 'atino-' + crypto.randomUUID();
    const filename = 'anh-dinh-kem.' + images.extensions[attachment.type];
    return [...headers, 'Content-Type: multipart/mixed; boundary="' + boundary + '"', '',
      '--' + boundary, ...textPart, '',
      '--' + boundary, 'Content-Type: ' + attachment.type,
      'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; filename="' + filename + '"', '',
      wrapBase64(attachment.base64), '--' + boundary + '--', ''
    ].join('\r\n');
  }

  function openDraft({title = 'Soạn email cho khách hàng', email = '', subject = ''} = {}) {
    dialog(title, field('Email người nhận', 'email', email, 'email', 'required maxlength="150"') +
      field('Tiêu đề', 'subject', subject, 'text', 'required maxlength="150"') +
      '<label>Nội dung<textarea class="field" name="body" rows="5" maxlength="4000" required></textarea></label>' +
      '<label>Ảnh đính kèm (tối đa 5 MB)<input class="field" type="file" name="attachment" accept="image/jpeg,image/png,image/webp"></label>',
    'Tải bản nháp email', async form => {
      const to = valueOf(form, 'email').trim();
      const subject = valueOf(form, 'subject').trim();
      const body = valueOf(form, 'body').trim();
      if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]+$/.test(to)) {
        throw new Error('Email người nhận chưa hợp lệ.');
      }
      if (!subject || !body) throw new Error('Nhập tiêu đề và nội dung email.');
      const file = form.elements.attachment.files[0];
      let attachment;
      if (file) attachment = {type: file.type, base64: (await images.read(file)).split(',')[1]};
      const message = emailDraft({to, subject, body, attachment});
      window.AtinoManager.downloadFile('Atino-email.eml', new Blob([message], {type:'message/rfc822'}));
      setMessage('Đã tải bản nháp. Mở tệp bằng ứng dụng email để gửi.');
    });
  }

  byId('forgot-password').addEventListener('click', forgotPassword);
  window.AtinoAccount = {open, openDraft, paintAvatar};
})();

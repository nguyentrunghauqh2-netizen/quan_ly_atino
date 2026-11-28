(() => {
  'use strict';

  function create({access, actor, renewSession, passwordHash, makeCredentials, publicAccount, fail}) {
    function audit(shop, account, action) {
      shop.audit ||= [];
      shop.audit.unshift({
        id: crypto.randomUUID(), when: Date.now(), employeeId: account.code,
        employeeName: account.name, action, reference: account.code
      });
    }

    function profile(account) {
      const {email = '', address = '', birthday = '', gender = ''} = account.profile || {};
      return {
        ...publicAccount(account), phone: account.phone || '', email, address, birthday, gender,
        hasRecoveryCode: Boolean(account.recoveryHash)
      };
    }

    function saveProfile(data) {
      const name = String(data.name ?? '').trim();
      const phone = String(data.phone ?? '').trim().replace(/[\s.-]/g, '');
      if (phone && !/^0\d{9}$/.test(phone)) fail('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
      const email = String(data.email ?? '').trim().slice(0, 150);
      const address = String(data.address ?? '').trim().slice(0, 300);
      const birthday = String(data.birthday ?? '').trim();
      const gender = String(data.gender ?? '');
      if (!name || name.length > 100) fail('Nhập họ tên từ 1 đến 100 ký tự.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email chưa hợp lệ.');
      if (birthday) {
        const day = new Date(birthday + 'T00:00:00Z');
        if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== birthday || birthday > window.AtinoERP.today()) {
          fail('Ngày sinh chưa hợp lệ.');
        }
      }
      if (!['', 'Nữ', 'Nam', 'Khác'].includes(gender)) fail('Thông tin giới tính chưa hợp lệ.');
      let avatar;
      if (Object.hasOwn(data, 'avatar')) {
        avatar = String(data.avatar ?? '');
        if (avatar && (avatar.length > 120000 || !window.AtinoImages.isDataImage(avatar))) {
          fail('Ảnh đại diện chưa hợp lệ.');
        }
      }
      return access(true, shop => {
        const account = actor(shop);
        Object.assign(account, {name, phone, profile: {email, address, birthday, gender}});
        if (avatar !== undefined) account.avatar = avatar;
        audit(shop, account, 'Cập nhật hồ sơ tài khoản');
        return {profile: profile(account)};
      });
    }

    async function verifyPassword(password) {
      const account = await access(false, shop => actor(shop));
      if (typeof password !== 'string' || password.length > 256 ||
        await passwordHash(password, account.salt) !== account.hash) {
        fail('Mật khẩu hiện tại chưa đúng.');
      }
      return account;
    }

    function unchangedAccount(shop, previous) {
      const current = actor(shop);
      if (current.code !== previous.code || current.revision !== previous.revision) {
        fail('Tài khoản vừa thay đổi. Vui lòng thử lại.');
      }
      return current;
    }

    function validateNewPassword(password) {
      if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
        fail('Mật khẩu mới cần từ 8 đến 256 ký tự.');
      }
    }

    async function changePassword(data) {
      validateNewPassword(data.newPassword);
      const previous = await verifyPassword(data.password);
      const credentials = await makeCredentials(data.newPassword);
      await access(true, shop => {
        const account = unchangedAccount(shop, previous);
        Object.assign(account, credentials);
        account.revision++;
        delete account.recoveryHash;
        audit(shop, account, 'Đổi mật khẩu');
        renewSession(shop, account);
      });
      return {ok: true};
    }

    async function hashRecoveryCode(code) {
      const bytes = new TextEncoder().encode(code);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    }

    async function issueRecoveryCode(data) {
      const previous = await verifyPassword(data.password);
      const code = Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
      const recoveryHash = await hashRecoveryCode(code);
      return access(true, shop => {
        const account = unchangedAccount(shop, previous);
        account.recoveryHash = recoveryHash;
        audit(shop, account, 'Tạo mã khôi phục');
        return {code: code.match(/.{4}/g).join('-')};
      });
    }

    async function resetPassword(data) {
      validateNewPassword(data.newPassword);
      const username = String(data.username ?? '').trim().toLowerCase().normalize('NFC');
      const code = String(data.code ?? '').replace(/[-\s]/g, '').toUpperCase();
      if (!/^[0-9A-F]{32}$/.test(code)) fail('Tên đăng nhập hoặc mã khôi phục chưa đúng.');
      const recoveryHash = await hashRecoveryCode(code);
      const credentials = await makeCredentials(data.newPassword);
      return access(true, shop => {
        const account = shop.staff.find(row => row.active && row.username === username && row.recoveryHash === recoveryHash);
        if (!account) fail('Tên đăng nhập hoặc mã khôi phục chưa đúng.');
        Object.assign(account, credentials);
        account.revision++;
        delete account.recoveryHash;
        audit(shop, account, 'Đặt lại mật khẩu bằng mã khôi phục');
        return {ok: true};
      });
    }

    return {
      read: () => access(false, shop => ({profile: profile(actor(shop))})),
      saveProfile, changePassword, issueRecoveryCode, resetPassword
    };
  }

  window.AtinoAccountStore = {create};
})();

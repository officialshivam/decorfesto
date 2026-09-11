import { createRepository } from '../dataAccess/repository.js';

export async function getSiteBranding() {
  try {
    const repository = createRepository('site_settings');
    const list = await repository.list();
    const logoRecord = (list || []).find(
      (s) => (s.setting_key || s.settingKey) === 'site_logo'
    );
    const logo = logoRecord?.setting_value || logoRecord?.settingValue || '/uploads/branding/decorfesto-logo.png';

    return {
      statusCode: 200,
      body: {
        logo,
      },
    };
  } catch (err) {
    console.warn('Failed to fetch site branding from database, returning default:', err.message);
    return {
      statusCode: 200,
      body: {
        logo: '/uploads/branding/decorfesto-logo.png',
      },
    };
  }
}


export interface LemonSqueezyProduct {
  id: string;
  variantId: string;
  name: string;
  price: string;
  checkoutUrl: string;
}

export const LEMON_PRODUCTS = {
  standard: {
    id: '733207',
    checkoutId: '5121ce40-a15d-47c0-bb71-1fd969e08a7b',
    name: 'Standard Plan',
  },
  premium: {
    id: '733209',
    checkoutId: '366ec035-57f4-4277-b5cb-84cc73b0093f',
    name: 'Premium Plan',
  },
};

export function generateCheckoutUrl(
  checkoutId: string,
  userEmail: string,
  userId: string
): string {
  if (!checkoutId) {
    console.error('Checkout ID is missing! Check your .env file.');
    throw new Error('Checkout ID is required');
  }
  
  const checkoutUrl = new URL(`https://submirra.lemonsqueezy.com/buy/${checkoutId}`);
  
  checkoutUrl.searchParams.set('checkout[email]', userEmail);
  checkoutUrl.searchParams.set('checkout[custom][user_id]', userId);
  
  console.log('Generated checkout URL:', checkoutUrl.toString());
  
  return checkoutUrl.toString();
}

export function getCustomerPortalUrl(): string {
  return 'https://submirra.lemonsqueezy.com/billing';
}

export function getPlanFromCheckoutId(checkoutId: string): 'standard' | 'premium' | null {
  if (checkoutId === LEMON_PRODUCTS.standard.checkoutId) return 'standard';
  if (checkoutId === LEMON_PRODUCTS.premium.checkoutId) return 'premium';
  return null;
}

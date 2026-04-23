// Mobile Responsiveness Test Utility
// Use this in browser console to test mobile breakpoints

const testMobileResponsiveness = () => {
  const breakpoints = {
    xs: 475,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  };

  const currentWidth = window.innerWidth;
  
  console.log(`Current viewport width: ${currentWidth}px`);
  
  // Determine current breakpoint
  let currentBreakpoint = 'base';
  for (const [name, width] of Object.entries(breakpoints)) {
    if (currentWidth >= width) {
      currentBreakpoint = name;
    }
  }
  
  console.log(`Current breakpoint: ${currentBreakpoint}`);
  
  // Test hero section elements
  const heroTitle = document.querySelector('h1');
  const heroButtons = document.querySelectorAll('main button');
  const trustIndicators = document.querySelector('[class*="trust"]');
  
  if (heroTitle) {
    const styles = window.getComputedStyle(heroTitle);
    console.log(`Hero title font size: ${styles.fontSize}`);
    console.log(`Hero title line height: ${styles.lineHeight}`);
  }
  
  if (heroButtons.length > 0) {
    heroButtons.forEach((button, index) => {
      const styles = window.getComputedStyle(button);
      console.log(`Button ${index + 1} height: ${styles.height}`);
      console.log(`Button ${index + 1} min-width: ${styles.minWidth}`);
    });
  }
  
  // Check for mobile-specific classes
  const mobileClasses = [
    'xs:text-3xl',
    'xs:mb-6', 
    'xs:px-4',
    'touch-manipulation',
    'xs:h-12'
  ];
  
  console.log('Mobile classes found:');
  mobileClasses.forEach(className => {
    const elements = document.querySelectorAll(`[class*="${className}"]`);
    if (elements.length > 0) {
      console.log(`✅ ${className}: ${elements.length} elements`);
    } else {
      console.log(`❌ ${className}: not found`);
    }
  });
  
  // Test scroll indicator
  const scrollIndicator = document.querySelector('[aria-label="Scroll to next section"]');
  if (scrollIndicator) {
    console.log('✅ Scroll indicator found with proper accessibility');
  } else {
    console.log('❌ Scroll indicator missing or lacks accessibility');
  }
  
  return {
    currentWidth,
    currentBreakpoint,
    isMobile: currentWidth < 640,
    isTablet: currentWidth >= 640 && currentWidth < 1024,
    isDesktop: currentWidth >= 1024
  };
};

// Auto-run on load
if (typeof window !== 'undefined') {
  window.testMobileResponsiveness = testMobileResponsiveness;
  console.log('Mobile responsiveness test utility loaded. Run testMobileResponsiveness() to test.');
}

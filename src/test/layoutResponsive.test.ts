import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  AppShell,
  getLayoutBreakpoint,
  isRouteWithRightPanel,
  PANEL_ROUTES,
  HIDDEN_PANEL_ROUTES,
} from '../components/layout/AppShell';

describe('Layout & Responsive System (Stream A)', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
  });

  const setViewportWidth = (width: number) => {
    act(() => {
      window.innerWidth = width;
      window.dispatchEvent(new Event('resize'));
    });
  };

  const renderShell = async (initialRoute = '/', content = 'Test Content') => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        React.createElement(
          MemoryRouter,
          { initialEntries: [initialRoute] },
          React.createElement(
            AppShell,
            null,
            React.createElement('div', { 'data-testid': 'test-content' }, content)
          )
        )
      );
    });
    return result!;
  };

  describe('Breakpoint Classification for all required resolutions', () => {
    const requiredBreakpoints = [
      { width: 360, expected: 'mobile' },
      { width: 480, expected: 'mobile' },
      { width: 768, expected: 'tablet-compact' },
      { width: 1024, expected: 'tablet-compact' },
      { width: 1100, expected: 'desktop-compact' },
      { width: 1366, expected: 'desktop-compact' },
      { width: 1440, expected: 'desktop-wide' },
      { width: 1536, expected: 'desktop-wide' },
      { width: 1920, expected: 'desktop-wide' },
      { width: 2560, expected: 'desktop-wide' },
    ] as const;

    it.each(requiredBreakpoints)(
      'should correctly classify width $width as $expected',
      ({ width, expected }) => {
        expect(getLayoutBreakpoint(width)).toBe(expected);
      }
    );
  });

  describe('Route-based Right Panel Visibility rules', () => {
    it('should show panel on allowed learning routes: /, /practice, /review, /stats', () => {
      for (const route of PANEL_ROUTES) {
        expect(isRouteWithRightPanel(route)).toBe(true);
      }
      expect(isRouteWithRightPanel('/roadmap')).toBe(true);
      expect(isRouteWithRightPanel('/practice?setId=set-1')).toBe(true);
    });

    it('should completely hide panel on utility and info routes: /import, /formulas, /manage, /settings, /welcome', () => {
      for (const route of HIDDEN_PANEL_ROUTES) {
        expect(isRouteWithRightPanel(route)).toBe(false);
      }
      expect(isRouteWithRightPanel('/benchmark')).toBe(false);
    });
  });

  describe('Root Wrapper Constraints & No App-level Max-Width', () => {
    it('should have 100% width, 100dvh, and NO max-width or mx-auto on app wrapper', async () => {
      setViewportWidth(1440);
      await renderShell('/');

      const root = screen.getByTestId('app-shell-root');
      expect(root).toBeInTheDocument();

      // Check classes: must have w-full, h-screen or h-[100dvh], max-w-none
      const classList = root.className;
      expect(classList).toContain('w-full');
      expect(classList).toContain('h-[100dvh]');
      expect(classList).toContain('max-w-none');
      expect(classList).not.toContain('max-w-7xl');
      expect(classList).not.toContain('mx-auto');

      // Main content scrollable container must not overflow horizontally
      const contentScroll = screen.getByTestId('main-content-scroll');
      expect(contentScroll.className).toContain('overflow-y-auto');
    });
  });

  describe('Mobile Viewport Tests (360px & 480px)', () => {
    it.each([360, 480])('at %ipx: hides sidebar, shows bottom nav with >=44px touch targets', async (width) => {
      setViewportWidth(width);
      await renderShell('/', `Content ${width}`);

      // Desktop & tablet sidebars must be hidden
      expect(screen.queryByTestId('left-sidebar-full')).not.toBeInTheDocument();
      expect(screen.queryByTestId('left-sidebar-rail')).not.toBeInTheDocument();

      // Right docked panel must be hidden (available via drawer only)
      expect(screen.queryByTestId('right-panel-docked')).not.toBeInTheDocument();

      // Mobile bottom nav must be visible
      const bottomNav = screen.getByTestId('mobile-bottom-nav');
      expect(bottomNav).toBeInTheDocument();

      // Check 5 main items + 1 "Thêm" button = 6 items
      const navButtons = bottomNav.querySelectorAll('a, button');
      expect(navButtons.length).toBe(6);

      // Verify touch targets >= 44px
      navButtons.forEach((btn) => {
        expect(btn.className).toContain('min-h-[44px]');
        expect(btn.className).toContain('min-w-[44px]');
      });

      // Quick chips on topbar exist
      const topbar = screen.getByTestId('app-topbar');
      expect(topbar).toBeInTheDocument();
      expect(screen.getByLabelText('Chuỗi học tập')).toBeInTheDocument();
      expect(screen.getByLabelText('Kinh nghiệm')).toBeInTheDocument();
    });
  });

  describe('Tablet Compact Viewport Tests (768px & 1024px)', () => {
    it.each([768, 1024])('at %ipx: collapses sidebar to ~72px icon rail, hides bottom nav and docked panel', async (width) => {
      setViewportWidth(width);
      await renderShell('/', `Content ${width}`);

      // Icon rail must be visible
      const iconRail = screen.getByTestId('left-sidebar-rail');
      expect(iconRail).toBeInTheDocument();
      expect(iconRail.className).toContain('w-[72px]');

      // Full sidebar and bottom nav must be absent
      expect(screen.queryByTestId('left-sidebar-full')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-panel-docked')).not.toBeInTheDocument();

      // Topbar with chips is present
      expect(screen.getByTestId('app-topbar')).toBeInTheDocument();
    });
  });

  describe('Desktop Compact Viewport Tests (1100px & 1366px)', () => {
    it.each([1100, 1366])('at %ipx: full 272px sidebar, content expanded, panel in drawer', async (width) => {
      setViewportWidth(width);
      await renderShell('/', `Content ${width}`);

      // Full sidebar must be visible
      const fullSidebar = screen.getByTestId('left-sidebar-full');
      expect(fullSidebar).toBeInTheDocument();
      expect(fullSidebar.className).toContain('w-[272px]');

      // Rail and bottom nav must not exist
      expect(screen.queryByTestId('left-sidebar-rail')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();

      // Docked panel is NOT rendered, allowing middle content to expand
      expect(screen.queryByTestId('right-panel-docked')).not.toBeInTheDocument();

      // Topbar with chips is present
      expect(screen.getByTestId('app-topbar')).toBeInTheDocument();
    });
  });

  describe('Desktop Wide Viewport Tests (1440px, 1536px, 1920px, 2560px)', () => {
    it.each([1440, 1536, 1920, 2560])(
      'at %ipx on panel route (/): full sidebar, expanded content, docked right panel (336px)',
      async (width) => {
        setViewportWidth(width);
        await renderShell('/', `Content ${width}`);

        // Sidebar full
        expect(screen.getByTestId('left-sidebar-full')).toBeInTheDocument();
        expect(screen.queryByTestId('left-sidebar-rail')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mobile-bottom-nav')).not.toBeInTheDocument();

        // Right panel docked
        const dockedPanel = screen.getByTestId('right-panel-docked');
        expect(dockedPanel).toBeInTheDocument();
        expect(dockedPanel.className).toContain('w-[336px]');
      }
    );

    it.each([1440, 1920])(
      'at %ipx on hidden route (/settings): right panel is completely hidden, topbar chips visible',
      async (width) => {
        setViewportWidth(width);
        await renderShell('/settings', 'Settings Page');

        // Sidebar full
        expect(screen.getByTestId('left-sidebar-full')).toBeInTheDocument();

        // Docked right panel must NOT be in the DOM
        expect(screen.queryByTestId('right-panel-docked')).not.toBeInTheDocument();

        // Topbar must be shown with chips
        const topbar = screen.getByTestId('app-topbar');
        expect(topbar).toBeInTheDocument();
        expect(screen.getByLabelText('Chuỗi học tập')).toBeInTheDocument();
      }
    );
  });

  describe('Right Drawer Interaction', () => {
    it('opens drawer when topbar chip or drawer button is clicked and closes on close button', async () => {
      setViewportWidth(1024);
      await renderShell('/', 'Test');

      // Drawer is initially closed
      expect(screen.queryByTestId('right-drawer')).not.toBeInTheDocument();

      // Click drawer button on topbar
      const drawerBtn = screen.getByLabelText('Mở tiến độ và mục tiêu');
      act(() => {
        fireEvent.click(drawerBtn);
      });

      // Drawer is now open
      expect(screen.getByTestId('right-drawer')).toBeInTheDocument();
      expect(screen.getByText(/Tiến độ học tập/)).toBeInTheDocument();

      // Click close button
      const closeBtn = screen.getByLabelText('Đóng tiến độ');
      act(() => {
        fireEvent.click(closeBtn);
      });

      // Drawer closes
      expect(screen.queryByTestId('right-drawer')).not.toBeInTheDocument();
    });
  });
});

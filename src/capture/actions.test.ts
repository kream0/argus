/**
 * Action Execution Tests
 */

import { describe, it, expect } from 'bun:test';
import type { Action } from '../types/config.ts';

describe('Action Types', () => {
    describe('ClickAction', () => {
        it('should have correct structure', () => {
            const action: Action = {
                type: 'click',
                selector: '#submit-button',
            };

            expect(action.type).toBe('click');
            expect((action as any).selector).toBe('#submit-button');
        });
    });

    describe('HoverAction', () => {
        it('should have correct structure', () => {
            const action: Action = {
                type: 'hover',
                selector: '.dropdown-trigger',
            };

            expect(action.type).toBe('hover');
            expect((action as any).selector).toBe('.dropdown-trigger');
        });
    });

    describe('WaitAction', () => {
        it('should have correct structure', () => {
            const action: Action = {
                type: 'wait',
                timeout: 1000,
            };

            expect(action.type).toBe('wait');
            expect((action as any).timeout).toBe(1000);
        });
    });

    describe('ScrollAction', () => {
        it('should support bottom scroll', () => {
            const action: Action = {
                type: 'scroll',
                target: 'bottom',
            };

            expect(action.type).toBe('scroll');
            expect((action as any).target).toBe('bottom');
        });

        it('should support top scroll', () => {
            const action: Action = {
                type: 'scroll',
                target: 'top',
            };

            expect((action as any).target).toBe('top');
        });

        it('should support selector scroll', () => {
            const action: Action = {
                type: 'scroll',
                target: '#footer',
            };

            expect((action as any).target).toBe('#footer');
        });
    });

    describe('TypeAction', () => {
        it('should have correct structure', () => {
            const action: Action = {
                type: 'type',
                selector: '#username',
                text: 'testuser',
            };

            expect(action.type).toBe('type');
            expect((action as any).selector).toBe('#username');
            expect((action as any).text).toBe('testuser');
        });
    });

    describe('SelectAction', () => {
        it('should have correct structure', () => {
            const action: Action = {
                type: 'select',
                selector: '#country',
                value: 'US',
            };

            expect(action.type).toBe('select');
            expect((action as any).selector).toBe('#country');
            expect((action as any).value).toBe('US');
        });
    });

    describe('Action sequences', () => {
        it('should support an array of actions', () => {
            const actions: Action[] = [
                { type: 'click', selector: '#open-modal' },
                { type: 'wait', timeout: 500 },
                { type: 'type', selector: '#form-input', text: 'Hello' },
                { type: 'click', selector: '#submit' },
            ];

            expect(actions).toHaveLength(4);
            expect(actions[0].type).toBe('click');
            expect(actions[1].type).toBe('wait');
            expect(actions[2].type).toBe('type');
            expect(actions[3].type).toBe('click');
        });
    });
});

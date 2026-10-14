// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRequests } from './useRequests';
import { REQUEST_STATUS, type RequestEvent } from './requests';

const event: RequestEvent = {
  type: 'job:create',
  requestId: 'create-1',
  payload: { title: 'Test job' },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useRequests', () => {
  it('registers before transmission and prevents duplicate pending submissions', () => {
    const { result } = renderHook(useRequests);
    const transmit = vi.fn(() => {
      expect(vi.getTimerCount()).toBe(1);

      return true;
    });
    act(() => {
      expect(result.current.submitRequest(event, transmit, 'Test job')).toBe(true);
      expect(result.current.submitRequest(event, transmit, 'Test job')).toBe(false);
    });
    expect(transmit).toHaveBeenCalledOnce();
    expect(result.current.requests).toHaveLength(1);
    expect(result.current.requests[0].status).toBe(REQUEST_STATUS.PENDING);
  });

  it('cancels timeout on ACK', () => {
    const { result } = renderHook(useRequests);
    act(() => {
      result.current.submitRequest(event, () => true, 'Test job');
    });
    act(() => {
      vi.advanceTimersByTime(4999);
      result.current.confirm(event.requestId);
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.requests[0].status).toBe(REQUEST_STATUS.CONFIRMED);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('times out at five seconds and accepts a late ACK', () => {
    const { result } = renderHook(useRequests);
    act(() => {
      result.current.submitRequest(event, () => true, 'Test job');
    });
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.requests[0].status).toBe(REQUEST_STATUS.PENDING);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.requests[0].status).toBe(REQUEST_STATUS.TIMED_OUT);
    act(() => {
      result.current.confirm(event.requestId);
    });
    expect(result.current.requests[0].status).toBe(REQUEST_STATUS.CONFIRMED);
  });

  it('retries the original request and keeps one history entry', () => {
    const { result } = renderHook(useRequests);
    const transmit = vi.fn(() => true);
    act(() => {
      result.current.submitRequest(event, transmit, 'Test job');
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    act(() => {
      expect(result.current.retry(event.requestId, transmit)).toBe(true);
    });
    expect(transmit).toHaveBeenNthCalledWith(2, event);
    expect(result.current.requests).toHaveLength(1);
    expect(result.current.requests[0].status).toBe(REQUEST_STATUS.PENDING);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('records a server refusal and does not offer retry for failed requests', () => {
    const { result } = renderHook(useRequests);
    act(() => {
      result.current.submitRequest(event, () => true, 'Test job');
    });
    act(() => {
      result.current.fail(event.requestId, 'Title must not be empty');
    });
    expect(result.current.requests[0]).toMatchObject({
      status: REQUEST_STATUS.FAILED,
      error: 'Title must not be empty',
    });
    expect(vi.getTimerCount()).toBe(0);
    const transmit = vi.fn(() => true);
    act(() => {
      expect(result.current.retry(event.requestId, transmit)).toBe(false);
    });
    expect(transmit).not.toHaveBeenCalled();
  });

  it('cleans up the timer when transport rejects the send', () => {
    const { result } = renderHook(useRequests);
    act(() => {
      expect(result.current.submitRequest(event, () => false, 'Test job')).toBe(false);
    });
    expect(result.current.requests[0].status).toBe(REQUEST_STATUS.TIMED_OUT);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels only pending statuses on disconnect', () => {
    const { result } = renderHook(useRequests);
    act(() => {
      result.current.submitRequest(event, () => true, 'Test job');
      result.current.submitRequest({ ...event, requestId: 'create-2' }, () => true, 'Second job');
    });
    act(() => {
      result.current.confirm('create-2');
      result.current.cancelPending();
    });
    expect(result.current.requests.map((request) => request.status)).toEqual([
      REQUEST_STATUS.TIMED_OUT,
      REQUEST_STATUS.CONFIRMED,
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears history and timers when switching rooms', () => {
    const { result } = renderHook(useRequests);
    act(() => {
      result.current.submitRequest(event, () => true, 'Test job');
    });
    act(() => {
      result.current.reset();
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.requests).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels timers on unmount', () => {
    const { result, unmount } = renderHook(useRequests);
    act(() => {
      result.current.submitRequest(event, () => true, 'Test job');
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('tracks and confirms an update request with its original version', () => {
    const update: RequestEvent = {
      type: 'job:update',
      requestId: 'update-1',
      payload: { id: 'job-1', completed: true, expectedVersion: 2 },
    };
    const { result } = renderHook(useRequests);
    act(() => {
      result.current.submitRequest(update, () => true, 'Test job');
    });
    act(() => {
      result.current.confirm(update.requestId);
    });
    expect(result.current.requests[0]).toMatchObject({
      event: update,
      status: REQUEST_STATUS.CONFIRMED,
    });
  });
});

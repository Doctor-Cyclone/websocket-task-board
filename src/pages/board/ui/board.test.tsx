// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoardHeader } from './BoardHeader';
import { JobRow } from './JobRow';
import { RequestsPanel } from './RequestsPanel';
import { ROOM } from '@/shared/rooms';
import { CONNECTION_STATUS } from '@/src/shared/connection';
import { REQUEST_STATUS } from '../model/requests';

const job = { id: 'job-1', title: 'Example', completed: false, version: 1 };

describe('board interface', () => {
  it('allows room selection while disconnected and locks it while connected', () => {
    const onRoomChange = vi.fn();
    const props = {
      room: ROOM.ALPHA,
      name: 'Alice',
      onNameChange: vi.fn(),
      onRoomChange,
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
    };
    const { rerender } = render(<BoardHeader {...props} status={CONNECTION_STATUS.DISCONNECTED} />);
    fireEvent.click(screen.getByLabelText('Beta'));
    expect(onRoomChange).toHaveBeenCalledWith(ROOM.BETA);
    rerender(<BoardHeader {...props} room={ROOM.BETA} status={CONNECTION_STATUS.CONNECTED} />);
    expect((screen.getByLabelText('Beta') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Alpha') as HTMLInputElement).matches(':disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeDefined();
  });

  it('keeps the original edit version when another tab changes the job', () => {
    const onRename = vi.fn();
    const props = {
      connected: true,
      onRename,
      onToggle: vi.fn(),
      onDelete: vi.fn(),
      onEditing: vi.fn(),
      editorNames: [],
    };
    const { rerender } = render(<JobRow {...props} job={job} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Example' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Rename Example' }), {
      target: { value: 'My title' },
    });
    rerender(<JobRow {...props} job={{ ...job, version: 2 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRename).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }), 'My title');
  });

  it('disables job actions while disconnected and shows remote editors', () => {
    render(
      <JobRow
        job={job}
        connected={false}
        onRename={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEditing={vi.fn()}
        editorNames={['Bob']}
      />,
    );
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Delete Example' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText('Bob editing…')).toBeDefined();
  });

  it('retries only timed-out requests and displays refusal reasons', () => {
    const onRetry = vi.fn();
    const event = {
      type: 'job:create' as const,
      requestId: 'request-1',
      payload: { title: 'Example' },
    };
    const { rerender } = render(
      <RequestsPanel
        connected
        requests={[{ event, title: 'Example', status: REQUEST_STATUS.TIMED_OUT }]}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledWith('request-1');
    rerender(
      <RequestsPanel
        connected
        requests={[
          { event, title: 'Example', status: REQUEST_STATUS.FAILED, error: 'Title is invalid' },
        ]}
        onRetry={onRetry}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('Title is invalid');
  });
});

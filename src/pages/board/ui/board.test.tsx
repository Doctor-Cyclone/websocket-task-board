// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BoardHeader } from './BoardHeader';
import type { ComponentProps } from 'react';
import type { Job } from '@/shared/protocol';
import { JobsPanel } from './JobsPanel';
import { RequestsPanel } from './RequestsPanel';
import { ROOM } from '@/shared/rooms';
import { CONNECTION_STATUS } from '@/src/shared/connection';
import { REQUEST_STATUS } from '../model/requests';

function JobCard({
  job,
  number,
  editorNames,
  ...props
}: Omit<ComponentProps<typeof JobsPanel>, 'jobs' | 'editors' | 'onCreate'> & {
  job: Job;
  number: number;
  editorNames: string[];
}) {
  return (
    <JobsPanel
      {...props}
      jobs={[{ ...job, number }]}
      onCreate={vi.fn()}
      editors={editorNames.map((name) => ({ jobId: job.id, clientId: name, name }))}
    />
  );
}

const job = { id: 'job-1', title: 'Example', completed: false, version: 1 };

// jsdom does not implement native dialog lifecycle methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

describe('board interface', () => {
  it('moves a dragged job to another column and keeps the dialog closed', () => {
    const onMove = vi.fn();
    render(
      <JobCard
        job={job}
        number={1}
        connected
        onMove={onMove}
        onDelete={vi.fn()}
        onUpdateDetails={vi.fn()}
        editorNames={[]}
        onEditing={vi.fn()}
      />,
    );
    const card = screen.getByRole('button', { name: 'Open Example' });
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    expect(card.getAttribute('draggable')).toBe('true');
    fireEvent.dragStart(card, { dataTransfer });
    const target = screen.getByRole('region', { name: 'In progress' });
    fireEvent.dragOver(target, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('move');
    fireEvent.drop(target, { dataTransfer });
    fireEvent.dragEnd(card, { dataTransfer });
    fireEvent.click(card);
    expect(onMove).toHaveBeenCalledWith({ ...job, number: 1 }, 'in-progress');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('rejects drops in the same column and while disconnected', () => {
    const onMove = vi.fn();
    const props = {
      job,
      number: 1,
      onMove,
      onDelete: vi.fn(),
      onUpdateDetails: vi.fn(),
      editorNames: [],
      onEditing: vi.fn(),
    };
    const { rerender } = render(<JobCard {...props} connected />);
    const card = screen.getByRole('button', { name: 'Open Example' });
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    for (const name of ['Backlog']) {
      fireEvent.dragStart(card, { dataTransfer });
      fireEvent.dragOver(screen.getByRole('region', { name }), { dataTransfer });
      expect(dataTransfer.dropEffect).toBe('none');
      fireEvent.drop(screen.getByRole('region', { name }), { dataTransfer });
      fireEvent.dragEnd(card, { dataTransfer });
    }
    fireEvent.dragStart(card, { dataTransfer });
    rerender(<JobCard {...props} connected={false} />);
    expect(card.getAttribute('draggable')).toBe('false');
    fireEvent.drop(screen.getByRole('region', { name: 'Done' }), { dataTransfer });
    expect(onMove).not.toHaveBeenCalled();
    rerender(<JobCard {...props} job={{ ...job, status: 'deleted' }} connected />);
    expect(screen.getByRole('button', { name: 'Open Example' }).getAttribute('draggable')).toBe(
      'false',
    );
  });

  it('deletes a job when dropped into Deleted without sending a status update', () => {
    const onMove = vi.fn();
    const onDelete = vi.fn();
    render(
      <JobCard
        job={job}
        number={1}
        connected
        onMove={onMove}
        onDelete={onDelete}
        onUpdateDetails={vi.fn()}
        editorNames={[]}
        onEditing={vi.fn()}
      />,
    );
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Open Example' }), { dataTransfer });
    const target = screen.getByRole('region', { name: 'Deleted' });
    fireEvent.dragOver(target, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('move');
    fireEvent.drop(target, { dataTransfer });
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(job.id);
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('requires a nonblank title and a connection before creating a job', () => {
    const onCreate = vi.fn();
    const props = {
      jobs: [],
      editors: [],
      onCreate,
      onMove: vi.fn(),
      onDelete: vi.fn(),
      onUpdateDetails: vi.fn(),
      onEditing: vi.fn(),
    };
    const { rerender } = render(<JobsPanel {...props} connected />);
    fireEvent.click(screen.getByRole('button', { name: 'New job' }));
    const button = screen.getByRole('button', { name: 'Create job' }) as HTMLButtonElement;
    const input = screen.getByLabelText('Job title');
    const form = input.closest('form')!;
    expect(button.disabled).toBe(true);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(button.disabled).toBe(true);
    fireEvent.submit(form);
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'New job' } });
    expect(button.disabled).toBe(false);
    fireEvent.click(screen.getByRole('radio', { name: 'In progress' }));
    fireEvent.submit(form);
    expect(onCreate).toHaveBeenCalledWith({
      title: 'New job',
      description: '',
      status: 'in-progress',
    });
    onCreate.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'New job' }));
    rerender(<JobsPanel {...props} connected={false} />);
    expect((screen.getByRole('button', { name: 'Create job' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.submit(screen.getByLabelText('Job title').closest('form')!);
    expect(onCreate).not.toHaveBeenCalled();
  });

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
    const onUpdateDetails = vi.fn();
    const props = {
      connected: true,
      onUpdateDetails,
      onMove: vi.fn(),
      onDelete: vi.fn(),
      onEditing: vi.fn(),
      editorNames: [],
    };
    const { rerender } = render(<JobCard {...props} number={1} job={job} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Example' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Job title' }), {
      target: { value: 'My title' },
    });
    rerender(<JobCard {...props} number={1} job={{ ...job, version: 2 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onUpdateDetails).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }), {
      title: 'My title',
      description: '',
    });
  });

  it('edits title and description together and dismisses without saving', () => {
    const onUpdateDetails = vi.fn();
    const onEditing = vi.fn();
    render(
      <JobCard
        job={{ ...job, description: 'Original notes' }}
        number={1}
        connected
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onUpdateDetails={onUpdateDetails}
        editorNames={[]}
        onEditing={onEditing}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Example' }));
    expect(
      (screen.getByLabelText('Description', { exact: false }) as HTMLTextAreaElement).value,
    ).toBe('Original notes');
    fireEvent.change(screen.getByLabelText('Description', { exact: false }), {
      target: { value: 'Updated notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onUpdateDetails).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }), {
      title: 'Example',
      description: 'Updated notes',
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onEditing).toHaveBeenLastCalledWith(job.id, false);
    onUpdateDetails.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Open Example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Example' }));
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { bubbles: false, cancelable: true }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onUpdateDetails).not.toHaveBeenCalled();
  });

  it('disables job actions while disconnected and shows remote editors', () => {
    render(
      <JobCard
        job={job}
        number={1}
        connected={false}
        onUpdateDetails={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onEditing={vi.fn()}
        editorNames={['Bob']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Example' }));
    expect(
      (screen.getByRole('button', { name: 'Edit Example' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    expect(
      (
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Delete Example',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText('Bob editing…')).toBeDefined();
  });

  it('keeps card previews minimal and changes status through the slider', () => {
    const onMove = vi.fn();
    const onEditing = vi.fn();
    render(
      <JobCard
        job={{ ...job, description: 'Private details' }}
        number={1}
        connected
        onMove={onMove}
        onDelete={vi.fn()}
        onUpdateDetails={vi.fn()}
        editorNames={[]}
        onEditing={onEditing}
      />,
    );
    expect(screen.queryByText('Private details')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit Example' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open Example' }));
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Private details')).toBeDefined();
    expect(onEditing).not.toHaveBeenCalled();
    expect((screen.getByRole('radio', { name: 'Backlog' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'In progress' }));
    expect(onMove).toHaveBeenCalledWith(
      { ...job, number: 1, description: 'Private details' },
      'in-progress',
    );
    expect(screen.getByRole('dialog')).toBeDefined();
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

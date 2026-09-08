'use client';

import { useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { useLogin, useSession } from '@/hooks/use-session';
import { parseErrorMessage } from '@/lib/parse/errors';
import { BrandMark } from '@/components/brand-mark';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const { data: user, isPending: sessionPending } = useSession();
  const login = useLogin();

  // Mirror of RequireAuth's guard: an already-authenticated visitor landing here
  // (browser Back, a stale bookmark) should bounce forward, not see the form.
  useEffect(() => {
    if (!sessionPending && user) {
      router.replace(next);
    }
  }, [sessionPending, user, next, router]);

  if (sessionPending || user) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get('username') ?? '');
    const password = String(formData.get('password') ?? '');

    login.mutate({ username, password }, { onSuccess: () => router.replace(next) });
  };

  return (
    <div className="w-full max-w-[26rem]">
      {/* The gradient lives on a wrapper one pixel larger than the card, so the card
          reads as having a lit rim rather than a coloured border box. It fades to the
          ordinary border colour within the first third, so only the top-left edge
          catches the brand light instead of the whole outline glowing. */}
      <div
        className="rounded-[calc(var(--radius-card)+1px)] p-px shadow-raised"
        style={{
          backgroundImage:
            'linear-gradient(145deg, var(--brand-400), var(--border) 38%, var(--border))',
        }}
      >
        <div className="bg-surface rounded-card p-8">
          <div className="mb-8 flex flex-col gap-4">
            <BrandMark className="size-11" />
            <div>
              <h1 className="text-h4 font-bold">
                Switch <span className="brand-gradient-text">Finance</span>
              </h1>
              <p className="text-muted text-body mt-1">Sign in with your Switch account.</p>
            </div>
          </div>

          <Form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <TextField name="username" isRequired fullWidth>
              <Label>Username</Label>
              <Input autoFocus autoComplete="username" placeholder="your.username" />
              <FieldError />
            </TextField>

            <TextField name="password" isRequired fullWidth>
              <Label>Password</Label>
              <Input type="password" autoComplete="current-password" placeholder="••••••••" />
              <FieldError />
            </TextField>

            {login.isError && (
              <Alert status="danger">
                <Alert.Content>
                  <Alert.Description>{parseErrorMessage(login.error, 'login')}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="shadow-accent mt-1"
              isDisabled={login.isPending}
              fullWidth
            >
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </Form>
        </div>
      </div>

      <p className="text-caption text-muted mt-6 text-center">
        Internal tool — access is granted by the Switch platform team.
      </p>
    </div>
  );
}

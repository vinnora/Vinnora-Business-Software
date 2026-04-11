import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    orgId?: string | null;
    orgRole?: string;
    role?: string;
    company?: string;
    subscription?: string;
    modules?: string[];
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      orgId: string | null;
      orgRole: string;
      role?: string;
      company?: string;
      subscription?: string;
      modules?: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    orgId?: string | null;
    orgRole?: string;
    role?: string;
    company?: string;
    subscription?: string;
    modules?: string[];
  }
}

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from './mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          orgId: user.orgId || null,
          orgRole: user.orgRole || 'member',
          role: user.role,
          company: user.company,
          subscription: user.subscription,
          modules: user.modules,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.orgId = user.orgId || null;
        token.orgRole = user.orgRole || 'member';
        token.role = user.role;
        token.company = user.company;
        token.subscription = user.subscription;
        token.modules = user.modules;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.orgId = (token.orgId as string) || null;
        session.user.orgRole = (token.orgRole as string) || 'member';
        session.user.role = token.role as string;
        session.user.company = token.company as string;
        session.user.subscription = token.subscription as string;
        session.user.modules = token.modules as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

import SolidAuth from 'solid-auth-client';
import { ldp } from 'rdf-namespaces';
import { getProfile } from './getProfile';

export async function sendFriendRequest(recipient: string) {
  const currentSession = await SolidAuth.currentSession();
  if (!currentSession || !currentSession.webId) {
    throw new Error('Please log in to send friend requests.');
  }

  const recipientProfile = await getProfile(recipient);
  const inboxUrl = recipientProfile.getRef(ldp.inbox);
  if (!inboxUrl) {
    throw new Error('This person does not accept friend requests.');
  }

  // TODO: Check if createDocument can do this with a URL we set manually:
  return SolidAuth.fetch(inboxUrl, {
    method: 'POST',
    body: `@prefix schema: <http://schema.org/> .
    <> a schema:BefriendAction ;
       schema:agent <${currentSession.webId}> .`,
    headers: {
      'Content-Type': 'text/turtle'
    }
  });
}

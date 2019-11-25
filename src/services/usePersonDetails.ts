import React from "react";
import { getDocument } from "./DocumentCache";
import { vcard } from "rdf-namespaces";
import { TripleSubject } from "tripledoc";
import { determineUriRef } from "./sendActionNotification";
import SolidAuth from 'solid-auth-client';

const as = {
  following: 'https://www.w3.org/TR/activitypub/#following'
};
const pim = {
  storage: 'http://www.w3.org/ns/pim/space#'
};

export enum PersonType {
  me,
  requester,
  requested,
  friend,
  blocked,
  stranger
}

// This is basically a model in the MVC sense.
// null means gave up on trying to determine it.
// There may be cases where the view doesn't need to know all aspects of
// the model, but for simplicity, `usePersonDetails` will always try to
// be as complete as possible.
export type PersonDetails = {
  webId: string,
  avatarUrl: string | null,
  fullName: string | null,
  friends: string[] | null,
  personType: PersonType | null
}

export async function getPodRoot(webId: string | null): Promise<string | null> {
  if (webId === null) {
    return null;
  }
  return determineUriRef(webId, pim.storage);
}

export async function getFriendslistRef(webId: string | null, createIfMissing: boolean): Promise<string | null> {
  if (webId === null) {
    return null;
  }
  let ret = await determineUriRef(webId, as.following);
  if (createIfMissing && !ret) {
    const podRoot = await getPodRoot(webId);
    if (!podRoot) {
      return null;
    }
    // FIXME?: is there a way to do this with tripledoc?
    const response = await SolidAuth.fetch(podRoot, {
      method: 'POST',
      headers: {
        Slug: 'friends',
        'Content-Type': 'text/turtle'
      },
      body: '<#this> a <http://www.w3.org/2006/vcard/ns#Group> .'
        + '<#this> <http://www.w3.org/2006/vcard/ns#fn> "Solid Friends" .'
    });
    const location = response.headers.get('Location');
    if (!location) {
      return null
    }
    ret = new URL('#this', location).toString();
    const profile: TripleSubject | null = await getUriSub(webId);
    if (profile) {
      profile.addRef(as.following, ret);
    }
  }
  return ret;
}

async function getFriends(webId: string): Promise<string[] | null> {
  const friendsListRef: string | null = await getFriendslistRef(webId, false);
  if (!friendsListRef) {
    return null;
  }
  const friendsListSub = await getUriSub(friendsListRef);
  return [];
}

async function getPersonType(webId: string): Promise<PersonType> {
  // function usePersonType(personWebId: string): PersonType | null {
  //   const userWebId = useWebId();
  //   const listsYou = useAsync(async () => {
  //     let found = false;
  //     if (userWebId) {
  //       const friendList: AddressBookGroup[] | null = await getFriendListsForWebId(personWebId);
  //       if (friendList) {
  //         friendList.forEach((addressBook: AddressBookGroup) => {
  //           if (addressBook.contacts.indexOf(userWebId) !== -1) {
  //             found = true;
  //           }
  //         });
  //       }
  //     }
  //     return found;
  //   }, false);
  
  //   const isInInbox = useAsync(async () => {
  //     let found = false;
  //     if (userWebId) {
  //       const friendRequests = await getIncomingRequests();
  //       return friendRequests.findIndex(request => request.getRef(schema.agent) === personWebId) !== -1;
  //     }
  //     return found;
  //   }, false);
  
  //   const isInYourList = useAsync(async () => {
  //     let found = false;
  //     if (userWebId) {
  //       const friendLists: TripleSubject[] | null = await getFriendLists();
  //       if (friendLists) {
  //         friendLists.forEach((friendList) => {
  //           const contacts = friendList.getAllNodeRefs(vcard.hasMember);
  //           if (contacts.indexOf(personWebId) !== -1) {
  //             found = true;
  //             // break;
  //           }
  //         });
  //       }
  //     }
  //     return found;
  //   }, false);
  //   if (!userWebId) {
  //     return null;
  //   }
  
  //   console.log({ personWebId, isInYourList, isInInbox, listsYou });
  //   let personType: PersonType = PersonType.stranger;
  //   if (personWebId === userWebId) {
  //     personType = PersonType.me;
  //   } else if (isInYourList) {
  //     if (listsYou) {
  //       personType = PersonType.friend
  //     } else {
  //       personType = PersonType.requested
  //     }
  //   } else if (isInInbox) {
  //     personType = PersonType.requested
  //   }
  //   return personType;
  // }
  
  return PersonType.stranger;
}

export async function getUriSub(uri: string): Promise<TripleSubject | null> {
  const doc = await getDocument(uri);
  if (doc === null) {
    return null;
  }
  return doc.getSubject(uri);
}

export async function getPersonDetails(webId: string): Promise<PersonDetails | null> {
  const profileSub = await getUriSub(webId);
  if (profileSub === null) {
    return null;
  }
  return {
    webId,
    avatarUrl: profileSub.getRef(vcard.hasPhoto)|| '/img/default-avatar.png',
    fullName: profileSub.getRef(vcard.fn) || '(no name)',
    friends: await getFriends(webId),
    personType: await getPersonType(webId)
  };
}

export function usePersonDetails(webId: string | null): PersonDetails | null {
  const [personDetails, setPersonDetails] = React.useState<PersonDetails | null>(null);
  if (webId === null) {
    return null;
  }
  if (webId && !personDetails) {
    getPersonDetails(webId).then(setPersonDetails).catch((e: Error) => {
      console.error(e.message);
    });
  }
  return personDetails;
}
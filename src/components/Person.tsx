import React, { useEffect } from 'react';
import { TripleSubject } from 'tripledoc';
import { foaf, vcard, schema } from 'rdf-namespaces';
import { Link } from 'react-router-dom';
import { useWebId } from '@solid/react';
import { getFriendListsForWebId, AddressBook } from '../services/getFriendListForWebId';
import { getFriendLists, unFriend } from '../services/getFriendList';
import { usePersonFriends } from './Profile';
import { getProfile } from '../services/getProfile';
import { sendBefriendActionNotification } from '../services/sendFriendRequest';
import { getIncomingRequests } from '../services/getIncomingRequests';

interface Props {
  webId: string;
};

export const Person: React.FC<Props> = (props) => {
  const [profile, setProfile] = React.useState();

  React.useEffect(() => {
    getProfile(props.webId).then(setProfile);
  }, [props.webId]);

  const personView = (profile)
    ? <PersonView subject={profile}/>
    : <code>{props.webId}</code>;

  return <>
    {personView}
  </>;
};

enum PersonType {
  me,
  requester,
  requested,
  friend,
  blocked,
  stranger
}

const PersonActions: React.FC<{ personType: PersonType, personWebId: string }> = (props) => {
  switch (props.personType) {
    case PersonType.me: return <>(this is you)</>;
    case PersonType.requester: return <>
      <button type="submit" className='button is-primary' onClick={() => {
        window.location.href = '';
      }}>See Friend Request</button>
    </>;
    case PersonType.requested: return <>
      <button type="submit" className='button is-warning' onClick={() => sendBefriendActionNotification(props.personWebId)}>Resend</button>
    </>;
    case PersonType.friend: return <>
      <button type="submit" className='button is-danger' onClick={() => {
        unFriend(props.personWebId).then(() => {
          console.log('unfriended', props.personWebId);
          window.location.href = '';  // FIXME: more subtle way to tell React to re-render
        }, (e: Error) => {
          console.log('could not unfriend', props.personWebId, e.message);
        });
    }}>Unfriend</button>
    </>;
    case PersonType.blocked: return <>(unblock)</>;
    case PersonType.stranger: return <>
      <button type="submit" className='button is-primary' onClick={() => sendBefriendActionNotification(props.personWebId)}>Befriend</button>
    </>;
  }
}

const FriendsInCommon: React.FC<{ personWebId: string }> = (props) => {
  const webId = useWebId();
  const theirFriends = usePersonFriends(props.personWebId);
  const myFriends = usePersonFriends(webId || null);
  console.log({ webId, theirFriends, myFriends });
  if (theirFriends && myFriends) {
    const friendsInCommon: string[] = Array.from(theirFriends.values()).filter(item => myFriends.has(item));
    const listElements = friendsInCommon.map(webId => <li>{webId}</li>);
    return <>Friends in common: <ul>{listElements}</ul></>;
  }
  return <>(no friends in common)</>;
}

function useAsync(fun: () => Promise<any>, defaultVal: any) {
  const [val, setVal] = React.useState(defaultVal);
  useEffect(() => {
    fun().then((val) => {
      setVal(val);
    });
  });
  return val;
}

const PersonView: React.FC<{ subject: TripleSubject }> = (props) => {
  const profile = props.subject;
  const personWebId = props.subject.asNodeRef();
  const webId = useWebId();
  const listsYou = useAsync(async () => {
    let found = false;
    if (webId) {
      const friendList: AddressBook[] | null = await getFriendListsForWebId(personWebId);
      if (friendList) {
        friendList.forEach((addressBook: AddressBook) => {
          if (addressBook.contacts.indexOf(webId) !== -1) {
            found = true;
          }
        });
      }
    }
    return found;
  }, false);

  const isInInbox = useAsync(async () => {
    let found = false;
    if (webId) {
      const friendRequests = await getIncomingRequests();
      return friendRequests.findIndex(request => request.getRef(schema.agent) === personWebId) !== -1;
    }
    return found;
  }, false);

  const isInYourList = useAsync(async () => {
    let found = false;
    if (webId) {
      const friendLists: TripleSubject[] | null = await getFriendLists();
      if (friendLists) {
        friendLists.forEach((friendList) => {
          const contacts = friendList.getAllNodeRefs(vcard.hasMember);
          if (contacts.indexOf(personWebId) !== -1) {
            found = true;
            // break;
          }
        });
      }
    }
    return found;
  }, false);
  if (!webId) {
    return <>(loading {personWebId})</>;
  }

  console.log({ personWebId, isInYourList, isInInbox, listsYou });
  let personType: PersonType = PersonType.stranger;
  if (personWebId === webId) {
    personType = PersonType.me;
  } else if (isInYourList) {
    if (listsYou) {
      personType = PersonType.friend
    } else {
      personType = PersonType.requested
    }
  } else if (isInInbox) {
    personType = PersonType.requested
  }

  const photoUrl = profile.getNodeRef(vcard.hasPhoto);
  const photo = (!photoUrl)
    ? null
    : <>
        <figure className="media-left">
          <p className="image is-64x64">
            <img src={profile.getNodeRef(vcard.hasPhoto)!} alt="Avatar" className="is-rounded"/>
          </p>
        </figure>
      </>;

  return <>
    <div className="media">
      {photo}
      <div className="media-content">
        <p className="content">
          <div>
            <Link
              to={`/profile/${encodeURIComponent(profile.asNodeRef())}`}
              title="View this person's friends"
            >
              {profile.getLiteral(foaf.name) || profile.getLiteral(vcard.fn) || profile.asNodeRef()}
            </Link>
          </div>
          <div>
            <PersonActions personType={personType} personWebId={props.subject.asNodeRef()}></PersonActions>
          </div>
          <div>
            <FriendsInCommon personWebId={props.subject.asNodeRef()}></FriendsInCommon>
          </div>         
        </p>
      </div>
    </div>
  </>;
};

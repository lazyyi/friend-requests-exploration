import React from 'react';
import { IncomingFriendRequest } from '../services/useIncomingFriendRequests';
import { usePersonDetails } from '../services/usePersonDetails';

interface Props {
  request: IncomingFriendRequest | null;
  onAccept: (req: IncomingFriendRequest) => void;
  onReject: (req: IncomingFriendRequest) => void;
};
export const FriendRequest: React.FC<Props> = (props) => {
  const profile = usePersonDetails(props.request ? props.request.webId : null)
  if (profile === null) {
    return (
      <p className="subtitle">
        There was an error getting the profile details of the person that sent this friend request.
      </p>
    );
  }
  if (typeof profile === 'undefined') {
    return (
      <p className="panel-block">
        Loading&hellip;
      </p>
    );
  }

  function acceptRequest(event: React.FormEvent) {
    event.preventDefault();
    if (props.request === null) {
      console.error('huh?');
    } else {
      props.onAccept(props.request);
    }
  }

  function rejectRequest(event: React.FormEvent) {
    event.preventDefault();
    if (props.request === null) {
      console.error('huh?');
    } else {
      props.onReject(props.request);
    }
  }

  return <>
    <div className="media">
      <div className="media-left">
        <figure className="image is-128x128">
          <img
            src={profile.avatarUrl || 'https://melvincarvalho.github.io/solid-profile/images/profile.png'}
            alt=""
          />
        </figure>
      </div>
      <div className="media-body content">
<<<<<<< HEAD
        <h3 className="subtitle is-5">
          {profile.fullName}
=======
        <h3 className="panel-block is-5">
          {profile.getString(foaf.name)}
>>>>>>> origin/master
        </h3>
        <form>
          <div className="field is-grouped">
            <div className="control">
              <button type="submit" onClick={rejectRequest} className="button">Reject</button>
            </div>
            <div className="control">
              <button type="submit" onClick={acceptRequest} className="button is-primary">Accept</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </>;
};

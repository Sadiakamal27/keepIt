import { useState, useEffect } from "react";

function CollaboratorsList({ noteId }) {
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (noteId) {
      fetch(`http://localhost:5000/collaborators/${noteId}`)
        .then((res) => res.json())
        .then((data) => setCollaborators(data.collaborators))
        .catch((err) => console.error("Failed to fetch collaborators", err));
    }
  }, [noteId]);

  return (
    <div>
      <h3>Collaborators</h3>
      <ul>
        {collaborators.map((collaborator, index) => (
          <li key={index}>
            {collaborator.email} - {collaborator.permission}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CollaboratorsList;

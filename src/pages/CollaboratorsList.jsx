import { useState, useEffect } from "react";

function CollaboratorsList({ noteid }) {
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (noteid) {
      fetch(`http://localhost:5000/notes/${noteid}/collaborators`)
        .then((res) => res.json())
        .then((data) => setCollaborators(data))
        .catch((err) => console.error("Failed to fetch collaborators", err));
    }
  }, [noteid]);

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
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getWorkspaceProjects(uid) {
  const snapshot = await getDocs(query(collection(db, "projects"), where("memberIds", "array-contains", uid)));
  return Promise.all(snapshot.docs.map(async (projectDoc) => {
    const project = { id: projectDoc.id, ...projectDoc.data() };
    const tasksSnapshot = await getDocs(collection(db, "projects", project.id, "tasks"));
    return { ...project, tasks: tasksSnapshot.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() })) };
  }));
}

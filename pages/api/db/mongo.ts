import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

class MongoDB {
  static disconnect() {
      throw new Error('Method not implemented.');
  }
  public client: MongoClient;
  public db: Db | undefined;
  private connectionPromise: Promise<void>;
  private resolveConnectionPromise!: (value: void | PromiseLike<void>) => void;
  private rejectConnectionPromise!: (reason?: any) => void;

  constructor(public uri: string, public dbName: string) {
    this.client = new MongoClient(this.uri);
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.resolveConnectionPromise = resolve;
      this.rejectConnectionPromise = reject;
    });
    this.connect();
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.resolveConnectionPromise();
      console.log(`Connected to database: ${this.dbName}`);
    } catch (error) {
      console.error(`Failed to connect to ${this.dbName}`, error);
      this.rejectConnectionPromise(error);
      throw error;
    }
  }

  public getDbConnectionPromise(): Promise<void> {
    return this.connectionPromise;
  }

  public async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from database');
    }
  }

  async updateTaskStatus(taskId: string, status: string) {
    if(this.db){
    const collection = this.db.collection('tasks'); // 'tasks' ist der Name der Collection

    // Aktualisiere den Status der Aufgabe anhand ihrer ID
    const result = await collection.updateOne(
      { _id: new ObjectId(taskId) }, // Sucht nach der Aufgabe mit der angegebenen ID
      { $set: { status: status } }   // Setzt den Status auf den neuen Wert
    );

    return result;
  }
  }

  // Methode zum Abrufen der Aufgaben-Sammlung
  public getTasksCollection(): Collection {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    return this.db.collection('tasks'); // Sammlung "tasks" verwenden
  }

  // Methode zum Hinzufügen einer Aufgabe
  public async addTask(task: any): Promise<any> {
    const collection = this.getTasksCollection();
    const result = await collection.insertOne(task);
    return result;
  }
}

export default MongoDB;

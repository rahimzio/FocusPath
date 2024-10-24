import { MongoClient, Db } from 'mongodb';

class MongoDB {
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
}

// Hauptlogik zur Verbindung mit der Cosmos DB
(async () => {
  const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING as string;
  const databaseName = 'your-database-name'; // Ersetze dies durch den Namen deiner Datenbank

  const mongoDB = new MongoDB(connectionString, databaseName);

  try {
    await mongoDB.getDbConnectionPromise();
    // Hier kannst du mit der Datenbank arbeiten
    // Beispiel: const collection = mongoDB.db?.collection('your-collection-name');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await mongoDB.disconnect();
  }
})();

export default MongoDB;
